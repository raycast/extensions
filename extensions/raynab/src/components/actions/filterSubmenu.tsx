import { onFilterType, Filter } from '@srcTypes';

import { ActionPanel, Action, Icon, Color } from '@raycast/api';
import { Shortcuts } from '@constants';

export function FilterBySubmenu({ onFilter, currentFilter }: { onFilter: onFilterType; currentFilter: Filter }) {
  return (
    <ActionPanel.Submenu title="Set Filter" shortcut={Shortcuts.Filter} icon={Icon.Pin}>
      <Action
        title="Inflow (Positive)"
        icon={currentFilter?.value === 'inflow' ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.ChevronUp}
        onAction={onFilter({ key: 'amount', value: 'inflow' })}
      />
      <Action
        title="Outflow (Negative)"
        icon={
          currentFilter?.value === 'outflow' ? { source: Icon.Checkmark, tintColor: Color.Green } : Icon.ChevronDown
        }
        onAction={onFilter({ key: 'amount', value: 'outflow' })}
      />
    </ActionPanel.Submenu>
  );
}
