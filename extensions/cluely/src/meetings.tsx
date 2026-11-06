import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  List,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { MeetingDetail } from "./components/meeting-detail";
import { Setup } from "./components/setup";
import {
  CLUELY_DASHBOARD,
  filterMeetings,
  findCli,
  loadMeetings,
  Meeting,
  mergeMeetings,
  readableError,
  SessionState,
  Since,
} from "./lib/cluely";

export default function Meetings() {
  const preferred = getPreferenceValues<{ cliPath?: string }>().cliPath;
  const [cliPath, setCliPath] = useState<string>();
  const [items, setItems] = useState<Meeting[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [total, setTotal] = useState<number>();
  const [filters, setFilters] = useState("all:7d");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const currentRead = useRef<AbortController | undefined>(undefined);
  const [state, since] = filters.split(":") as [SessionState | "all", Since];
  useEffect(() => {
    const abort = new AbortController();
    currentRead.current?.abort();
    currentRead.current = abort;
    setLoading(true);
    setError(undefined);
    setCliPath(undefined);
    setItems([]);
    setCursor(undefined);
    setTotal(undefined);
    findCli(preferred)
      .then(async (path) => {
        if (abort.signal.aborted) return;
        setCliPath(path);
        const result = await loadMeetings(
          path,
          { state: state === "all" ? "" : state, since },
          abort.signal,
        );
        if (!abort.signal.aborted) {
          setItems(result.items);
          setCursor(result.nextCursor);
          setTotal(result.total);
        }
      })
      .catch((err) => {
        if (!abort.signal.aborted) setError(readableError(err));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => {
      currentRead.current?.abort();
    };
  }, [preferred, state, since, revision]);
  async function loadMore() {
    if (!cliPath || !cursor || loading) return;
    const abort = new AbortController();
    currentRead.current = abort;
    setLoading(true);
    try {
      const result = await loadMeetings(
        cliPath,
        { state: state === "all" ? "" : state, since, cursor },
        abort.signal,
      );
      if (!abort.signal.aborted) {
        setItems((current) => mergeMeetings(current, result.items));
        setCursor(result.nextCursor);
        setTotal(result.total);
      }
    } catch (err) {
      if (!abort.signal.aborted)
        await showToast({
          style: Toast.Style.Failure,
          title: "Could Not Load More Meetings",
          message: readableError(err),
        });
    } finally {
      if (!abort.signal.aborted) setLoading(false);
    }
  }
  const refresh = () => setRevision((value) => value + 1);
  if (error)
    return <Setup message={error} cliPath={cliPath} refresh={refresh} />;
  const visible = filterMeetings(items, query);
  return (
    <List
      isLoading={loading}
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
                {cursor && (
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
      {cursor && (
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
