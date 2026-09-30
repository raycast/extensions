import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { getInboxes } from "../services/mailtrap";
import ListEmailsView from "./list-emails";
import { useCachedState } from "@raycast/utils";

interface ListInboxsViewProps {
  inboxId?: number;
}

export default function ListInboxsView({ inboxId }: ListInboxsViewProps) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("show-inbox-details", false);
  const { isLoading, data, revalidate } = getInboxes();

  if (data.length > 0 && inboxId) {
    const inboxIndex = data.findIndex((inbox) => inbox.id === inboxId);
    if (inboxIndex !== -1) {
      const inbox = data.splice(inboxIndex, 1);
      data.unshift(inbox[0]);
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search inbox" isShowingDetail={isShowingDetail}>
      {data.map((inbox) => (
        <List.Item
          key={inbox.id}
          icon={{ source: Icon.Box, tintColor: getStatusColor(inbox.status) }}
          title={inbox.name}
          accessories={[
            {
              icon: Icon.EyeDisabled,
              text: inbox.emails_unread_count.toString(),
              tooltip: `${inbox.emails_unread_count} Unread`,
            },
            { icon: Icon.Envelope, text: inbox.emails_count.toString(), tooltip: `${inbox.emails_count} Emails` },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.TagList title="Status">
                    <List.Item.Detail.Metadata.TagList.Item text={inbox.status} color={getStatusColor(inbox.status)} />
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.Label title="API Domain" text={inbox.api_domain} />
                  <List.Item.Detail.Metadata.Label title="Domain" text={inbox.domain} />
                  <List.Item.Detail.Metadata.Label title="POP3 Domain" text={inbox.pop3_domain} />
                  <List.Item.Detail.Metadata.Label title="Email Domain" text={inbox.email_domain} />
                  <List.Item.Detail.Metadata.TagList title="SMTP Ports">
                    {inbox.smtp_ports.map((port) => (
                      <List.Item.Detail.Metadata.TagList.Item key={port} text={port.toString()} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="POP3 Ports">
                    {inbox.pop3_ports.map((port) => (
                      <List.Item.Detail.Metadata.TagList.Item key={port} text={port.toString()} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                  <List.Item.Detail.Metadata.TagList title="Permissions">
                    {Object.entries(inbox.permissions).map(([permission, allowed]) => (
                      <List.Item.Detail.Metadata.TagList.Item
                        key={permission}
                        text={permission}
                        color={allowed ? Color.Green : Color.Red}
                      />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
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
              <Action
                title="Toggle Details"
                icon={Icon.AppWindowSidebarLeft}
                shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                onAction={() => setIsShowingDetail((prev) => !prev)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
      return Color.Green;
    default:
      return undefined;
  }
}
