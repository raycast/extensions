import { type SortNames, onSortType } from '@srcTypes';

import { renderActionIcon } from './actionIcon';
import { ActionPanel, Action, Icon } from '@raycast/api';
import { Shortcuts } from '@constants';

export function SortBySubmenu({ onSort, currentSort }: { onSort: onSortType; currentSort: SortNames | null }) {
  const renderSortIcon = renderActionIcon<SortNames>({
    defaultIcon: Icon.Envelope,
    currentType: currentSort,
  });

  return (
    <ActionPanel.Submenu icon={Icon.Envelope} title="Set Sorting" shortcut={Shortcuts.Sort}>
      <Action title="Amount (Low to High)" icon={renderSortIcon('amount_asc')} onAction={onSort('amount_asc')} />
      <Action title="Amount (High to Low)" icon={renderSortIcon('amount_desc')} onAction={onSort('amount_desc')} />
      <Action title="Date (Old to New)" icon={renderSortIcon('date_asc')} onAction={onSort('date_asc')} />
      <Action title="Date (New to Old)" icon={renderSortIcon('date_desc')} onAction={onSort('date_desc')} />
    </ActionPanel.Submenu>
  );
}
