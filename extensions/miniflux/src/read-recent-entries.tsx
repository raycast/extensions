import { List, showToast, Toast, Cache } from "@raycast/api";
import apiServer from "./utils/api";
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        showToast(Toast.Style.Animated, "Fetching latest entries.....─=≡Σ((( つ＞＜)つ");

        const { entries }: MinifluxEntries = await apiServer.getRecentEntries();

        setState({ entries, isLoading: false });

        showToast(Toast.Style.Success, "Latest entries has been loaded !＼(≧▽≦)／");
        cache.set("latest-entries", JSON.stringify(entries));
      } catch (error) {
        handleError(error as MinifluxApiError);
        setState((oldState) => ({ ...oldState, isLoading: false }));
      }
    };

    fetchData();
  }, []);

  return (
    <List
      isShowingDetail
      isLoading={state.isLoading}
      throttle={true}
      navigationTitle="Search entries"
      searchBarPlaceholder="Search from your miniflux feeds"
      searchBarAccessory={<FilterDropdown handleFilter={setFilterValue} filter="categories" />}
    >
      {filteredEntries.map((entry) => (
        <List.Item
          key={entry.id}
          title={entry.title}
          keywords={[...entry.title]}
          detail={<List.Item.Detail markdown={nhm.translate(`<h2>${entry.title}</h2>${entry.content}`)} />}
          actions={<ControlActions entry={entry} />}
          icon={useEntryIcon(entry)}
        />
      ))}
    </List>
  );
}
