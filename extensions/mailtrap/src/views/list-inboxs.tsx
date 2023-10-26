import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { getInboxes } from "../services/mailtrap";
import ListEmailsView from "./list-emails";

interface ListInboxsViewProps {
  inboxId?: number;
}

export default function ListInboxsView({ inboxId }: ListInboxsViewProps) {
  const { isLoading, data, revalidate } = getInboxes();

  if (data && data.length > 0 && inboxId) {
    const inboxIndex = data.findIndex((inbox) => inbox.id === inboxId);
    if (inboxIndex !== -1) {
      const inbox = data.splice(inboxIndex, 1);
      data.unshift(inbox[0]);
    }
  }

  return (
    <List isLoading={isLoading}>
      {(data || []).map((inbox) => (
        <List.Item
          key={inbox.id}
          title={inbox.name}
          accessories={[{ icon: Icon.Eye, text: `${inbox.emails_unread_count} / ${inbox.emails_count}` }]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Tray} title="Open Inbox" target={<ListEmailsView inboxId={inbox.id} />} />
              <Action.CopyToClipboard title="Copy ID" content={inbox.id} />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
