import { Action, ActionPanel, Icon, Keyboard, showToast, Toast } from '@raycast/api';
import { EditHistoryForm } from './edit-history-form';
import type { HistoryFormValues, HistoryItem } from './types';

type Props = {
  item: HistoryItem;
  onDelete: (item: HistoryItem) => Promise<void>;
  onPurge: () => Promise<void>;
  onUpdate: (id: number, values: HistoryFormValues) => Promise<void>;
};

export function HistoryActions({ item, onDelete, onPurge, onUpdate }: Props) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard content={item.result ?? ''} shortcut={Keyboard.Shortcut.Common.Copy} />
      <ActionPanel.Section title="Manage History">
        <Action.Push
          icon={Icon.Pencil}
          shortcut={Keyboard.Shortcut.Common.Edit}
          title="Edit History Entry"
          target={<EditHistoryForm item={item} onUpdate={onUpdate} />}
        />
        <Action
          icon={Icon.Trash}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={() =>
            onDelete(item).catch(() =>
              showToast({
                style: Toast.Style.Failure,
                title: 'Could not delete history entry',
              }),
            )
          }
          style={Action.Style.Destructive}
          title="Delete History Entry"
        />
        <Action
          icon={Icon.Trash}
          shortcut={Keyboard.Shortcut.Common.RemoveAll}
          onAction={() =>
            onPurge().catch(() =>
              showToast({
                style: Toast.Style.Failure,
                title: 'Could not delete all history',
              }),
            )
          }
          style={Action.Style.Destructive}
          title="Delete All History"
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
