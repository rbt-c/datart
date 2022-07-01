/**
 * Datart
 *
 * Copyright 2021
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { CheckOutlined } from '@ant-design/icons';
import { Dropdown, Menu } from 'antd';
import {
  ChartDataSectionType,
  DataViewFieldType,
  RUNTIME_DATE_LEVEL_KEY,
} from 'app/constants';
import ChartDrillContext from 'app/contexts/ChartDrillContext';
import useI18NPrefix from 'app/hooks/useI18NPrefix';
import { DrillMode } from 'app/models/ChartDrillOption';
import DateLevelMenuItems from 'app/pages/ChartWorkbenchPage/components/ChartOperationPanel/components/ChartFieldAction/DateLevelAction/DateLevelMenuItems';
import { ChartConfig, ChartDataSectionField } from 'app/types/ChartConfig';
import { getRuntimeDateLevelFields, getStyles } from 'app/utils/chartHelper';
import { updateBy } from 'app/utils/mutation';
import classnames from 'classnames';
import { DATARTSEPERATOR } from 'globalConstants';
import { FC, memo, useCallback, useContext, useMemo } from 'react';
import styled from 'styled-components/macro';
import { FONT_WEIGHT_MEDIUM, SPACE_SM } from 'styles/StyleConstants';
import { InteractionMouseEvent } from '../FormGenerator/constants';

const ChartDrillContextMenu: FC<{ chartConfig?: ChartConfig }> = memo(
  ({ children, chartConfig }) => {
    const t = useI18NPrefix(`viz.palette.drill`);
    const {
      drillOption,
      onDrillOptionChange,
      availableSourceFunctions,
      onDateLevelChange,
      onViewDataChange,
      onDrillThroughChange,
      onCrossFilteringChange,
    } = useContext(ChartDrillContext);

    const currentDrillLevel = drillOption?.getCurrentDrillLevel();
    const currentFields = drillOption?.getCurrentFields();

    const runtimeDateLevelFields = useMemo(() => {
      if (!drillOption) {
        return;
      }
      const allFields = drillOption.getAllFields();
      const groupSection = chartConfig?.datas?.find(
        v => v.type === ChartDataSectionType.Group,
      );
      let rows: ChartDataSectionField[] | undefined = [];

      if (currentFields) {
        rows = groupSection?.rows?.filter(v =>
          currentFields.some(val => val.uid === v.uid),
        );
      } else {
        rows = groupSection?.rows?.filter(v => v.uid === allFields[0].uid);
      }
      return getRuntimeDateLevelFields(rows);
    }, [drillOption, chartConfig?.datas, currentFields]);

    const handleDateLevelChange = useCallback(
      (config: ChartDataSectionField) => {
        const groupData = chartConfig?.datas?.find(
          v => v.type === ChartDataSectionType.Group,
        );

        if (groupData) {
          const _groupData = updateBy(groupData, draft => {
            if (draft.rows) {
              const index = draft.rows.findIndex(v => v.uid === config.uid);
              const runtimeDateLevel =
                draft.rows[index][RUNTIME_DATE_LEVEL_KEY];
              const replacedConfig = runtimeDateLevel
                ? runtimeDateLevel
                : draft.rows[index];

              draft.rows[index][RUNTIME_DATE_LEVEL_KEY] = config;
              draft.replacedConfig = replacedConfig;
            }
          });

          onDateLevelChange?.('data', {
            needRefresh: true,
            ancestors: [0],
            value: _groupData,
          });
        }
      },
      [chartConfig?.datas, onDateLevelChange],
    );

    const selectDrillStatusMenu = useMemo(() => {
      return (
        <Menu.Item key="selectDrillStatus">
          <StyledMenuSwitch
            className={classnames({ on: !!drillOption?.isSelectedDrill })}
          >
            <p>
              {drillOption?.isSelectedDrill
                ? t('selectDrillOn')
                : t('selectDrillOff')}
            </p>
            <CheckOutlined className="icon" />
          </StyledMenuSwitch>
        </Menu.Item>
      );
    }, [drillOption?.isSelectedDrill, t]);

    const jumpRules = useMemo(() => {
      const drillThroughSetting = getStyles(
        chartConfig?.interactions || [],
        ['drillThrough'],
        ['setting'],
      )?.[0];
      return drillThroughSetting?.rules?.filter(
        r => r.event === InteractionMouseEvent.Right,
      );
    }, [chartConfig?.interactions]);

    const menuVisible = !chartConfig?.datas?.filter(
      v => v.drillContextMenuVisible,
    ).length;

    const hasContextMenu =
      (menuVisible && drillOption?.isDrillable) ||
      runtimeDateLevelFields?.length;

    const contextMenu = useMemo(() => {
      if (!hasContextMenu) {
        return <></>;
      }

      return (
        <StyledChartDrillMenu
          onClick={({ key }) => {
            if (!drillOption) {
              return;
            }
            if (key === 'selectDrillStatus') {
              drillOption?.toggleSelectedDrill(!drillOption?.isSelectedDrill);
              onDrillOptionChange?.(drillOption);
            } else if (key === DrillMode.Drill) {
              drillOption?.drillDown();
              onDrillOptionChange?.(drillOption);
            } else if (key === DrillMode.Expand) {
              drillOption?.expandDown();
              onDrillOptionChange?.(drillOption);
            } else if (key === 'rollUp') {
              drillOption?.rollUp();
              onDrillOptionChange?.(drillOption);
            } else if (key.includes('drillThrough')) {
              onDrillThroughChange?.(key.split(DATARTSEPERATOR)?.[1]);
            } else if (key === 'viewData') {
              onViewDataChange?.();
            } else if (key === 'crossFiltering') {
              onCrossFilteringChange?.();
            }
          }}
        >
          {onDrillThroughChange && (
            <Menu.SubMenu key={'drillThrough'} title={t('drillThrough')}>
              {(jumpRules || []).map(rule => {
                return (
                  <Menu.Item key={`drillThrough${DATARTSEPERATOR}${rule.id}`}>
                    {rule?.name || rule.id}
                  </Menu.Item>
                );
              })}
            </Menu.SubMenu>
          )}
          {onViewDataChange && (
            <Menu.Item key={'viewData'}>{t('viewData')}</Menu.Item>
          )}
          {onCrossFilteringChange && (
            <Menu.Item key={'crossFiltering'}>{t('crossFiltering')}</Menu.Item>
          )}
          {!!currentDrillLevel && (
            <Menu.Item key={'rollUp'}>{t('rollUp')}</Menu.Item>
          )}
          {drillOption?.mode !== DrillMode.Expand &&
            !drillOption?.isBottomLevel && (
              <Menu.Item key={DrillMode.Drill}>{t('showNextLevel')}</Menu.Item>
            )}
          {drillOption?.mode !== DrillMode.Drill &&
            !drillOption?.isBottomLevel && (
              <Menu.Item key={DrillMode.Expand}>
                {t('expandNextLevel')}
              </Menu.Item>
            )}
          {drillOption?.mode !== DrillMode.Expand && selectDrillStatusMenu}

          {runtimeDateLevelFields?.map((v, i) => {
            if (v.type === DataViewFieldType.DATE) {
              return (
                <Menu.SubMenu key={i} title={v.colName}>
                  <DateLevelMenuItems
                    availableSourceFunctions={availableSourceFunctions}
                    config={v[RUNTIME_DATE_LEVEL_KEY] || v}
                    onChange={handleDateLevelChange}
                  />
                </Menu.SubMenu>
              );
            }
            return false;
          })}
        </StyledChartDrillMenu>
      );
    }, [
      hasContextMenu,
      onDrillThroughChange,
      t,
      jumpRules,
      onViewDataChange,
      currentDrillLevel,
      drillOption,
      selectDrillStatusMenu,
      runtimeDateLevelFields,
      onDrillOptionChange,
      availableSourceFunctions,
      handleDateLevelChange,
      onCrossFilteringChange,
    ]);

    return (
      <StyledChartDrill className="chart-drill-menu-container">
        <Dropdown
          disabled={!drillOption}
          overlay={contextMenu}
          destroyPopupOnHide={true}
          trigger={['contextMenu']}
        >
          <div style={{ height: '100%' }}>{children}</div>
        </Dropdown>
      </StyledChartDrill>
    );
  },
);

export default ChartDrillContextMenu;

const StyledChartDrill = styled.div`
  position: relative;
  width: 100%;
`;

const StyledChartDrillMenu = styled(Menu)`
  min-width: 200px;
`;

const StyledMenuSwitch = styled.div`
  display: flex;
  align-items: center;

  p {
    flex: 1;
  }

  .icon {
    display: none;
  }

  &.on {
    p {
      font-weight: ${FONT_WEIGHT_MEDIUM};
    }

    .icon {
      display: block;
      flex-shrink: 0;
      padding-left: ${SPACE_SM};
      color: ${p => p.theme.success};
    }
  }
`;
