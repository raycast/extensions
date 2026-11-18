import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, Monitor } from "./types";
import { useState } from "react";

const { api_key } = getPreferenceValues<Preferences>();
const token = btoa(`${api_key}:`);
const CRONITOR_VERSION = "2025-11-28";
const CRONITOR_PAGE_SIZE = 20;

export default function SearchMonitors() {
  const [searchText, setSearchText] = useState("");

  const {
    isLoading,
    data: monitors,
    pagination,
  } = useFetch(
    (options) =>
      "https://cronitor.io/api/monitors?" +
      new URLSearchParams({
        page: String(options.page + 1),
        pageSize: String(CRONITOR_PAGE_SIZE),
        search: searchText,
      }).toString(),
    {
      headers: {
        Authorization: `Basic ${token}`,
        "Cronitor-Version": CRONITOR_VERSION,
      },
      async parseResponse(response) {
        const result = await response.json();
        if (!response.ok) {
          const err = result as ErrorResult;
          throw new Error("detail" in err ? err.detail : err.error.message);
        }
        return result;
      },
      mapResult(result: { monitors: Monitor[]; page_size: number; page: number; total_monitor_count: number }) {
        return {
          data: result.monitors,
          hasMore: result.page * result.page_size < result.total_monitor_count,
        };
      },
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} pagination={pagination} isShowingDetail onSearchTextChange={setSearchText} throttle>
      {monitors.map((monitor) => (
        <List.Item
          key={monitor.key}
          icon="cronitor.png"
          title={monitor.name}
          detail={
            <List.Item.Detail
              markdown={`![](${monitor.badges.detailed})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Created" text={monitor.created} />
                  <List.Item.Detail.Metadata.Label title="Disabled" icon={monitor.disabled ? Icon.Check : Icon.Xmark} />
                  <List.Item.Detail.Metadata.Label title="Key" text={monitor.key} />
                  <List.Item.Detail.Metadata.Label title="Name" text={monitor.name} />
                  <List.Item.Detail.Metadata.TagList title="Type">
                    <List.Item.Detail.Metadata.TagList.Item text={monitor.type} />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={`https://cronitor.io/app/monitors/${monitor.key}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
