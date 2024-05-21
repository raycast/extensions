import { List } from "@raycast/api";
import { EnhancedTrackListItem } from "./components/enhanced-track-list-item";
import { ErrorDetail } from "./components/error-detail";
import { EnhancedTrack } from "./common/types";
import { useFetchSearch } from "./hooks/use-fetch-search";

type TrackResults = {
  id: string;
  enhancedTrack: EnhancedTrack;
};

export default function SearchTracksCommand() {
  const { data, isLoading, error, setSearchText } = useFetchSearch<TrackResults>({ collection: "songs" });
  if (error) return <ErrorDetail />;

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for a Song"
      isShowingDetail={Boolean(data)}
    >
      {!data && <List.EmptyView description={`Search for a Song`} />}
      {data &&
        data.hits
          ?.filter((hit) => Boolean(hit?.document?.enhancedTrack))
          .map(({ document }) => <EnhancedTrackListItem track={document.enhancedTrack} key={document.id} />)}
    </List>
  );
}
