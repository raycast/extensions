import { Action, ActionPanel, getPreferenceValues, List } from "@raycast/api";
import { ActionCopyScreenshotUrl, ActionDeleteIncident } from "./actions";
import { IncidentsState, Preferences } from "./interface";
import { useFetch } from "@raycast/utils";
import { baseUrl } from "./constants";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const {
    isLoading,
    data: incidents,
    revalidate,
  } = useFetch<IncidentsState>(`${baseUrl}/incidents`, {
    headers: { Authorization: `Bearer ${preferences.apiKey}` },
  });

  if (!incidents?.data?.length) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="No Incidents" description="You can add an incident using the 'Add Incident' command." />
      </List>
    );
  }

  return (
    <List isShowingDetail isLoading={isLoading}>
      {incidents.data.map((item, index) => (
        <List.Item
          key={index}
          title={item.attributes.name}
          subtitle={item.attributes.url}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="General" />

                  <List.Item.Detail.Metadata.Label title="ID" text={item.id} />
                  <List.Item.Detail.Metadata.Label title="Name" text={item.attributes.name} />
                  <List.Item.Detail.Metadata.Label title="URL" text={item.attributes.url ?? "-"} />
                  <List.Item.Detail.Metadata.Label
                    title="HTTP Method"
                    text={item.attributes.http_method ? item.attributes.http_method.toUpperCase() : "-"}
                  />
                  <List.Item.Detail.Metadata.Label title="Cause" text={item.attributes.cause} />
                  <List.Item.Detail.Metadata.Label
                    title="Started At"
                    text={item.attributes.started_at.replace("T", " ")}
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
              {item.attributes.screenshot_url && (
                <>
                  <Action.OpenInBrowser title="Open Screenshot in Browser" url={item.attributes.screenshot_url} />
                  <ActionCopyScreenshotUrl url={item.attributes.screenshot_url} />
                </>
              )}
              <ActionDeleteIncident item={item} onDeleted={() => revalidate()} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
