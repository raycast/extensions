import { Action, ActionPanel, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { EnhancedTrackListItem } from "./components/enhanced-track-list-item";
import { EnhancedTrack } from "./common/types";
import { CYANITE_API_URL } from "./common/constants";
import { ErrorDetail } from "./components/error-detail";
import { useState } from "react";

type VibeSearchResults = {
  id: string;
  enhancedTrack: EnhancedTrack;
};

export default function VibeSearchCommand() {
  const [searchText, setSearchText] = useState<string>("");
  const [executeSearch, setExecuteSearch] = useState<boolean>(false);

  const { isLoading, data, error } = useFetch<VibeSearchResults[]>(
    `${CYANITE_API_URL}/free-text/search?searchText=${searchText}`,
    {
      execute: Boolean(executeSearch),
      onData: () => setExecuteSearch(false),
      onError: () => setExecuteSearch(false),
    },
  );

  function handleSubmit() {
    setExecuteSearch(true);
  }

  if (error) return <ErrorDetail />;

  return (
    <List
      actions={
        <ActionPanel title="sonu.stream">
          <Action title="Search" onAction={handleSubmit} />
        </ActionPanel>
      }
      throttle={true}
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a Vibe"
      isShowingDetail={Boolean(data)}
    >
      {data &&
        data
          .filter((item) => Boolean(item?.enhancedTrack?.song))
          .map((item) => <EnhancedTrackListItem track={item.enhancedTrack} key={item.id} />)}
      {!data && <List.EmptyView description={`i.e. eclectic jazz to cook pasta to\n(press enter to search)`} />}
    </List>
  );
}
