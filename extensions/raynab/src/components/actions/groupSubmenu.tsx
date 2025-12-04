import { type GroupNames, onGroupType } from '@srcTypes';

import { renderActionIcon } from './actionIcon';
import { ActionPanel, Action, Icon } from '@raycast/api';
import { Shortcuts } from '@constants';

export function GroupBySubmenu({ onGroup, currentGroup }: { onGroup: onGroupType; currentGroup: GroupNames | null }) {
  const renderGroupIcon = renderActionIcon<GroupNames>({
    defaultIcon: Icon.Sidebar,
    currentType: currentGroup,
  });

  return (
    <ActionPanel.Submenu icon={Icon.Sidebar} title="Set Grouping" shortcut={Shortcuts.Group}>
      <Action title="Category" icon={renderGroupIcon('category_name')} onAction={onGroup('category_name')} />
      <Action title="Payee" icon={renderGroupIcon('payee_name')} onAction={onGroup('payee_name')} />
      <Action title="Account" icon={renderGroupIcon('account_name')} onAction={onGroup('account_name')} />
    </ActionPanel.Submenu>
  );
}
