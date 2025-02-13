import { List, showToast, Toast, Cache } from "@raycast/api";
import apiServer from "./utils/api";
import { MinifluxEntry } from "./utils/types";
import { useEffect, useState, useMemo } from "react";
import { MinifluxEntries, MinifluxApiError, State } from "./utils/types";
import ControlActions from "./components/ControlActions";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { useErrorHandler } from "./utils/useErrorHandler";
import FilterDropdown from "./components/FilterDropdown";
import { useEntryIcon } from "./utils/useEntryIcon";

const cache = new Cache();
const nhm = new NodeHtmlMarkdown();

export default function readRecentEntries() {
  const cached = cache.get("latest-entries");
  const [filterValue, setFilterValue] = useState("showAll");
  const [state, setState] = useState<State>({
    entries: cached ? JSON.parse(cached) : [],
    isLoading: true,
  });

  const handleError = useErrorHandler();

  const filteredEntries = useMemo(
    () =>
      state.entries?.filter((entry) => filterValue === "showAll" || entry.feed.category.title === filterValue) || [],
    [filterValue, state.entries]
  );

  const fetchData = async () => {
    try {
      showToast(Toast.Style.Animated, "Fetching latest entries...");

      const { entries }: MinifluxEntries = await apiServer.getRecentEntries();

      cache.set("latest-entries", JSON.stringify(entries));
      setState({ entries, isLoading: false });

      showToast(Toast.Style.Success, "Latest entries have been loaded");
    } catch (error) {
      handleError(error as MinifluxApiError);
      setState((oldState) => ({ ...oldState, isLoading: false }));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <List
      isShowingDetail
      isLoading={state.isLoading}
      throttle={true}
      navigationTitle="Search entries"
      searchBarPlaceholder="Search from your Miniflux feeds"
      searchBarAccessory={<FilterDropdown handleFilter={setFilterValue} filter="categories" />}
    >
      {filteredEntries.map((entry) => (
        <ListItem key={entry.id} entry={entry} onRefresh={fetchData} entries={filteredEntries} />
      ))}
    </List>
  );
}

const ListItem = ({
  entry,
  onRefresh,
  entries,
}: {
  entry: MinifluxEntry;
  onRefresh: () => Promise<void>;
  entries: MinifluxEntry[];
}) => {
  const icon = useEntryIcon(entry);

  return (
    <List.Item
      key={entry.id}
      title={entry.title}
      keywords={[...entry.title]}
      detail={<List.Item.Detail markdown={nhm.translate(`<h2>${entry.title}</h2>${entry.content}`)} />}
      actions={<ControlActions entry={entry} onRefresh={onRefresh} entries={entries} />}
      icon={icon}
    />
  );
};
