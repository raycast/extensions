import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";

interface Watch {
  last_changed: number;
  last_checked: number;
  last_error: false | string;
  title: string | null;
  url: string;
  viewed: boolean;
}
interface WatchesResponse {
  [key: string]: Watch;
}

const { instance_url, api_key } = getPreferenceValues<Preferences>();

function useApi<T>(endpoint: string) {
  const url = new URL(`api/v1/${endpoint}`, instance_url).toString();
  const { isLoading, data } = useFetch<T>(url, {
    headers: {
      "x-api-key": api_key,
    },
  });
  return { isLoading, data };
}

export default function ListWatches() {
  try {
    new URL(instance_url);
  } catch (error) {
    return (
      <Detail
        markdown={"# Error \n\n Invalid URL"}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }
  const url = new URL(instance_url).toString();

  const { isLoading, data } = useApi<WatchesResponse>("watch");

  return (
    <List isLoading={isLoading}>
      {data &&
        Object.entries(data).map(([id, watch]) => {
          const keywords: string[] = [];
          if (watch.title) keywords.push(watch.title);

          const icon = getFavicon(watch.url, { fallback: Icon.Globe });

          return (
            <List.Item
              key={id}
              icon={icon}
              title={watch.url}
              subtitle={watch.title ?? undefined}
              keywords={keywords}
              accessories={[
                { icon: watch.viewed ? Icon.Eye : Icon.EyeDisabled, tooltip: watch.viewed ? "Viewed" : "Not Viewed" },
                { date: new Date(watch.last_checked * 1000), tooltip: "Last Checked", icon: Icon.MagnifyingGlass },
                watch.last_changed
                  ? { date: new Date(watch.last_changed * 1000), tooltip: "Last Changed", icon: Icon.Pencil }
                  : { text: "Not yet", tooltip: "Last Changed", icon: Icon.Pencil },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push icon={Icon.Eye} title="View Details" target={<WatchDetails id={id} />} />
                  <Action.OpenInBrowser icon={Icon.ArrowNe} title="Preview" url={`${url}preview/${id}#text`} />
                  <Action.Push
                    icon={Icon.List}
                    title="View History"
                    target={<WatchHistory id={id} />}
                    shortcut={{ modifiers: ["cmd"], key: "h" }}
                  />
                  <Action.OpenInBrowser
                    icon={Icon.ArrowNe}
                    title="Edit"
                    url={`${url}edit/${id}#general`}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                  />
                  <Action.OpenInBrowser icon={icon} url={watch.url} shortcut={Keyboard.Shortcut.Common.Open} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

function WatchDetails({ id }: { id: string }) {
  interface WatchDetails extends Watch {
    check_count: number;
    date_created: number;
    last_viewed: number;
    method: "OPTIONS" | "GET" | "DELETE" | "PATCH" | "POST" | "PUT";
    notification_alert_count: number;
    paused: boolean;
    processor: "restock_diff" | "text_json_diff";
    sort_text_alphabetically: boolean;
    tags: string[];
    uuid: string;
    last_notification_error: false | string;
    history_n: number;
  }
  const { isLoading, data } = useApi<WatchDetails>(`watch/${id}`);
  const markdown = !data ? "" : `${data.title ?? ""} \n\n ${data.url}`;
  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Check Count" text={data.check_count.toString()} />
            <Detail.Metadata.Label title="Date Created" text={new Date(data.date_created * 1000).toString()} />
            <Detail.Metadata.Label
              title="Last Viewed"
              text={data.last_viewed ? new Date(data.last_viewed * 1000).toString() : "N/A"}
            />
            <Detail.Metadata.Label title="Method" text={data.method} />
            <Detail.Metadata.Label title="Notification Alert Count" text={data.notification_alert_count.toString()} />
            <Detail.Metadata.Label title="Paused" icon={data.paused ? Icon.Check : Icon.Xmark} />
            <Detail.Metadata.Label
              title="Processor"
              text={
                data.processor === "restock_diff"
                  ? "Re-stock & Price detection for single product pages"
                  : "Webpage Text/HTML, JSON and PDF changes"
              }
            />
            <Detail.Metadata.Label title="Sort Text Alphabetically" icon={data.paused ? Icon.Check : Icon.Xmark} />
          </Detail.Metadata>
        )
      }
    />
  );
}

function WatchHistory({ id }: { id: string }) {
  interface WatchHistory {
    [timestamp: string]: string;
  }
  const { isLoading, data } = useApi<WatchHistory>(`watch/${id}/history`);

  return (
    <List isLoading={isLoading}>
      {data &&
        Object.keys(data).map((timestamp) => (
          <List.Item
            key={timestamp}
            title={new Date(+timestamp * 1000).toUTCString()}
            accessories={[{ date: new Date(+timestamp * 1000) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.ArrowNe}
                  title="View Snapshot"
                  url={`${new URL(`preview/${id}`, instance_url)}?version=${timestamp}#text`}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
