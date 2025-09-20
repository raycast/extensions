import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { ActionCopyHeartbeatUrl, ActionDeleteHeartbeat } from "./actions";
import { baseUrl, statusMap } from "./constants";
import { HeartbeatsState, Preferences } from "./interface";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    isLoading,
    data: heartbeats,
    revalidate,
  } = useFetch<HeartbeatsState>(`${baseUrl}/heartbeats`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });

  if (!heartbeats?.data?.length) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView
          title="No Heartbeats"
          description="You can add a heartbeat using the 'Add Heartbeat' command."
        />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {heartbeats.data.map((item, index) => (
        <List.Item
          key={index}
          icon={statusMap[item.attributes.status] ?? "🔍"}
          title={item.attributes.name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={item.attributes.name} />
                  <List.Item.Detail.Metadata.Label title="Period" text={`${item.attributes.period}`} />
                  <List.Item.Detail.Metadata.Label title="Grace" text={`${item.attributes.grace}`} />

                  <List.Item.Detail.Metadata.Separator />

                  <List.Item.Detail.Metadata.Label title="Notifications" />

                  <List.Item.Detail.Metadata.Label title="Call" text={item.attributes.call ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="SMS" text={item.attributes.sms ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="Email" text={item.attributes.email ? "Yes" : "No"} />
                  <List.Item.Detail.Metadata.Label title="Push" text={item.attributes.push ? "Yes" : "No"} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Heartbeat URL in Browser" url={item.attributes.url} />
              <ActionCopyHeartbeatUrl url={item.attributes.url} />
              <ActionDeleteHeartbeat item={item} onDeleted={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
