import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { getGuitaretabResults, getSongsterrResults } from "../util";
import { CommandState, Song } from "../types";

const SharedCommand = ({ siteName }: { siteName: string }) => {
  const [state, setState] = useState<CommandState>({});
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        setState({ records: state.records, loading: true });
        let feed: Song[] = await getSongsterrResults(searchText);
        if (siteName === "Guitaretab") {
          feed = await getGuitaretabResults(searchText);
        }
        setState({ records: feed, loading: false });
      } catch (error) {
        setState({
          error: error instanceof Error ? error : new Error("Something went wrong"),
        });
      }
    };

    fetchRecords();
  }, [searchText]);

  let noResultsText = "No results...";
  let noResultsIcon: Icon | null = Icon.Important;
  if (!state.loading && !searchText) {
    noResultsText = "Type something to search.";
    noResultsIcon = null;
  }
  if (state.error) {
    noResultsText = "Error: " + state.error.message;
  }
  if (state.loading) {
    noResultsText = "Loading...";
    noResultsIcon = Icon.CircleProgress;
    if (searchText) {
      noResultsText = "Searching...";
    }
  }

  return (
    <List
      isLoading={state.loading || (!state.records && !state.error)}
      searchBarPlaceholder={`Search ${siteName} tabs and chords...`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      <List.EmptyView title={noResultsText} icon={noResultsIcon} />
      {state.records?.map((item, index) => {
        const accessories = [{ icon: Icon.Person, text: item.artist }];
        if ("difficulty" in item && item.difficulty) {
          accessories.push({ icon: Icon.Hammer, text: item.difficulty });
        }

        return (
          <List.Item
            key={index}
            title={item.title}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={item.url} />
                <Action.CopyToClipboard title="Copy URL to Clipboard" content={item.url} />
                <Action.CopyToClipboard title="Copy Song Title to Clipboard" content={item.title} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default SharedCommand;
