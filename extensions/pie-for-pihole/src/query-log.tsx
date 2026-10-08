import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getPiholeAPI } from "./api/client";
import { QueryBlockStatus } from "./interfaces";
import { AddToListAction } from "./utils";

const PAGE_SIZE = 100;

export default function QueryLogCommand() {
  const [timeRange, setTimeRange] = useState("3600");

  const {
    isLoading,
    data: queryLogs,
    pagination,
    revalidate,
  } = useCachedPromise(
    (range: string) => async (options: { page: number; cursor?: number }) => {
      const result = await getPiholeAPI().getQueryLogs(parseInt(range), PAGE_SIZE, options.cursor);
      return {
        data: result.data,
        hasMore: result.hasMore,
        cursor: result.cursor,
      };
    },
    [timeRange],
    { keepPreviousData: true },
  );

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle="Query Log"
      searchBarPlaceholder="Search for domains"
      searchBarAccessory={
        <List.Dropdown tooltip="Time Range" value={timeRange} onChange={setTimeRange}>
          <List.Dropdown.Item title="Last 15 min" value="900" />
          <List.Dropdown.Item title="Last hour" value="3600" />
          <List.Dropdown.Item title="Last 6 hours" value="21600" />
          <List.Dropdown.Item title="Last 24 hours" value="86400" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No queries found" description="Try a different time range" />
      {queryLogs?.map((item, index) => (
        <List.Item
          key={`${item.timestamp}-${item.domain}-${index}`}
          title={item.domain}
          icon={
            item.blockStatus === QueryBlockStatus.Blocked
              ? { source: Icon.XMarkCircle, tintColor: Color.Red }
              : item.blockStatus === QueryBlockStatus.Cached
                ? { source: Icon.MemoryChip, tintColor: Color.Blue }
                : { source: Icon.Checkmark, tintColor: Color.Green }
          }
          subtitle={`${item.client} ${
            item.blockStatus === QueryBlockStatus.Blocked
              ? "(Blocked)"
              : item.blockStatus === QueryBlockStatus.Cached
                ? "(Local cache)"
                : ""
          }`}
          accessories={[{ text: item.timestamp }]}
          actions={
            <ActionPanel title="Actions">
              <AddToListAction
                domain={item.domain}
                listType={item.blockStatus === QueryBlockStatus.Blocked ? "white" : "black"}
              />
              <Action.CopyToClipboard content={item.domain} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
