import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { MeetingDetail } from "./components/meeting-detail";
import { Setup } from "./components/setup";
import {
  CLUELY_DASHBOARD,
  filterMeetings,
  findCli,
  loadMeetings,
  mergeMeetings,
  readableError,
  SessionState,
  Since,
} from "./lib/cluely";

export default function Meetings() {
  const preferred = getPreferenceValues<Preferences>().cliPath;
  const [filters, setFilters] = useState("all:7d");
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState<number>();
  const abortable = useRef<AbortController>(null);
  const [state, since] = filters.split(":") as [SessionState | "all", Since];
  const cli = usePromise(findCli, [preferred], { onError: () => undefined });
  const cliPath = cli.data;
  const meetings = usePromise(
    (path: string, state: SessionState | "all", since: Since) =>
      async ({ cursor }: { page: number; cursor?: string }) => {
        const result = await loadMeetings(
          path,
          { state: state === "all" ? "" : state, since, cursor },
          abortable.current?.signal,
        );
        setTotal(result.total);
        return {
          data: result.items,
          hasMore: Boolean(result.nextCursor),
          cursor: result.nextCursor,
        };
      },
    [cliPath ?? "", state, since],
    {
      execute: Boolean(cliPath),
      abortable,
      onError: async (error) => {
        // The first page shows the setup screen; later pages only toast.
        if (meetings.data?.length)
          await showFailureToast(readableError(error), {
            title: "Could Not Load More Meetings",
          });
      },
    },
  );
  const items = mergeMeetings([], meetings.data ?? []);
  const loading = cli.isLoading || meetings.isLoading;
  const hasMore = meetings.pagination?.hasMore ?? false;
  const loadMore = () => meetings.pagination?.onLoadMore();
  const refresh = () => {
    if (cli.error) cli.revalidate();
    else meetings.revalidate();
  };
  const failure = cli.error ?? (items.length ? undefined : meetings.error);
  if (failure)
    return (
      <Setup
        message={readableError(failure)}
        cliPath={cliPath}
        refresh={refresh}
      />
    );
  const visible = filterMeetings(items, query);
  return (
    <List
      isLoading={loading}
      pagination={meetings.pagination}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search titles and tags in loaded meetings"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Meeting State and Date"
          value={filters}
          onChange={setFilters}
        >
          <List.Dropdown.Section title="All States">
            <List.Dropdown.Item title="Past 24 Hours" value="all:24h" />
            <List.Dropdown.Item title="Past 7 Days" value="all:7d" />
            <List.Dropdown.Item title="Past 30 Days" value="all:30d" />
            <List.Dropdown.Item title="All Dates" value="all:" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="By State — All Dates">
            <List.Dropdown.Item title="Finished" value="finished:" />
            <List.Dropdown.Item title="Ongoing" value="ongoing:" />
            <List.Dropdown.Item title="Analyzing" value="analyzing:" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={Icon.Video}
        title={query ? "No Loaded Meetings Match" : "No Meetings in This Range"}
        description="Choose another date range or state. Search matches titles and tags, not transcript contents."
        actions={
          <ActionPanel>
            <Action
              title="Refresh Meetings"
              onAction={refresh}
              icon={Icon.ArrowClockwise}
            />
          </ActionPanel>
        }
      />
      <List.Section
        title="Meetings"
        subtitle={`${items.length} loaded${total !== undefined ? ` of ${total}` : ""} · ${visible.length} matching`}
      >
        {visible.map((item) => (
          <List.Item
            key={item.id}
            title={item.title}
            icon={Icon.Video}
            subtitle={item.tags.map((tag) => tag.name).join(", ")}
            keywords={item.tags.map((tag) => tag.name)}
            accessories={[
              { text: item.state },
              ...(Number.isNaN(Date.parse(item.createdAt))
                ? []
                : [{ date: new Date(item.createdAt) }]),
            ]}
            actions={
              <ActionPanel>
                {cliPath && (
                  <Action.Push
                    title="Preview Meeting"
                    icon={Icon.Document}
                    target={<MeetingDetail meeting={item} cliPath={cliPath} />}
                  />
                )}
                <Action.CopyToClipboard
                  title="Copy Meeting ID"
                  content={item.id}
                />
                <Action
                  title="Refresh Meetings"
                  icon={Icon.ArrowClockwise}
                  onAction={refresh}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                />
                {hasMore && (
                  <Action
                    title="Load More Meetings"
                    icon={Icon.Plus}
                    onAction={loadMore}
                  />
                )}
                <Action.OpenInBrowser
                  title="Open Cluely Dashboard"
                  url={CLUELY_DASHBOARD}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {hasMore && (
        <List.Section title="More Results">
          <List.Item
            id="load-more"
            title="Load More Meetings"
            subtitle="Search covers the meetings loaded so far"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Load More Meetings"
                  onAction={loadMore}
                  icon={Icon.Plus}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
