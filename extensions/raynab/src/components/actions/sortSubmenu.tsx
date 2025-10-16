import { type SortNames, onSortType } from '@srcTypes';

import { renderActionIcon } from './actionIcon';
import { ActionPanel, Action, Icon } from '@raycast/api';
import { Shortcuts } from '@constants';

export function SortBySubmenu({ onSort, currentSort }: { onSort: onSortType; currentSort: SortNames | null }) {
  const renderSortIcon = renderActionIcon<SortNames>({
    defaultIcon: Icon.AppWindowList,
    currentType: currentSort,
  });

  return (
    <ActionPanel.Submenu icon={Icon.AppWindowList} title="Set Sorting" shortcut={Shortcuts.Sort}>
      <Action title="Amount (low to High)" icon={renderSortIcon('amount_asc')} onAction={onSort('amount_asc')} />
      <Action title="Amount (high to Low)" icon={renderSortIcon('amount_desc')} onAction={onSort('amount_desc')} />
      <Action title="Date (old to New)" icon={renderSortIcon('date_asc')} onAction={onSort('date_asc')} />
      <Action title="Date (new to Old)" icon={renderSortIcon('date_desc')} onAction={onSort('date_desc')} />
    </ActionPanel.Submenu>
  );
}
