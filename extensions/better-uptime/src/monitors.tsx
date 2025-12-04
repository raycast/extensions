import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { baseUrl, statusMap } from "./constants";
import { MonitorsState, Preferences } from "./interface";
import { ucfirst } from "./utils";
import { ActionCopyUrl, ActionDeleteMonitor } from "./actions";
import { useFetch } from "@raycast/utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    isLoading,
    data: monitors,
    revalidate,
  } = useFetch<MonitorsState>(`${baseUrl}/monitors`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });

  if (!monitors?.data?.length) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="No Monitors" description="You can add a monitor using the 'Add Monitor' command." />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {monitors.data.map((item, index) => (
        <List.Item
          key={index}
          icon={statusMap[item.attributes.status] ?? "🔍"}
          title={item.attributes.url}
          subtitle={item.attributes.pronounceable_name}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
                  <List.Item.Detail.Metadata.Label title="URL" text={item.attributes.url} />
                  <List.Item.Detail.Metadata.Label
                    title="Pronounceable Name"
                    text={item.attributes.pronounceable_name}
                  />
                  <List.Item.Detail.Metadata.Label title="Monitor Type" text={ucfirst(item.attributes.monitor_type)} />
                  <List.Item.Detail.Metadata.Label
                    title="Check Frequency"
                    text={`${item.attributes.check_frequency} seconds`}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Last Checked At"
                    text={item.attributes.last_checked_at.replace("T", " ")}
                  />

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
              <Action.OpenInBrowser title="Open URL in Browser" url={item.attributes.url} />
              <ActionCopyUrl url={item.attributes.url} />
              <ActionDeleteMonitor item={item} onDeleted={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
