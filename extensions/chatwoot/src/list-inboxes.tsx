import { useCachedPromise } from "@raycast/utils";
import { chatwoot } from "./chatwoot";
import { ActionPanel, Color, Icon, List } from "@raycast/api";
import OpenInChatwoot from "./open-in-chatwoot";

export default function ListInboxes() {
  const { isLoading, data: inboxes } = useCachedPromise(
    async () => {
      const { payload } = await chatwoot.inboxes.list();
      return payload;
    },
    [],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading}>
      {inboxes.map((inbox) => (
        <List.Item
          key={inbox.id}
          icon={
            inbox.avatar_url ||
            (inbox.channel_type === "Channel::WebWidget"
              ? { source: "website.svg", tintColor: Color.SecondaryText }
              : Icon.Tray)
          }
          title={inbox.name}
          accessories={[{ tag: inbox.channel_type }]}
          actions={
            <ActionPanel>
              <OpenInChatwoot route={`settings/inboxes/${inbox.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
