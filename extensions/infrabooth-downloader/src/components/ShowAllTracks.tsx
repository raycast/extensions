import { List } from "@raycast/api";
import { usePagedSearch } from "../hooks/usePagedSearch";
import { TrackListItem } from "./TrackListItem";

export function ShowAllTracks({ query }: { query: string }) {
  const { items, isLoading, pagination, title } = usePagedSearch("tracks", query);
  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`${title} for “${query}”`}
      searchBarPlaceholder={`Filter ${title.toLowerCase()}…`}
    >
      {items.map((track, index) => (
        <TrackListItem
          key={`${track.trackId}-${index}`}
          track={track}
          playContext={{ tracks: items, startIndex: index }}
        />
      ))}
    </List>
  );
}
