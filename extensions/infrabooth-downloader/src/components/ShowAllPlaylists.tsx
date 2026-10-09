import { List } from "@raycast/api";
import { usePagedSearch } from "../hooks/usePagedSearch";
import { uniqueById, type PlaylistKind } from "../lib/onlineSearch";
import { prefetchSelectedPlaylist } from "../lib/prefetch";
import { PlaylistListItem } from "./PlaylistListItem";

export function ShowAllPlaylists({ kind, query }: { kind: PlaylistKind; query: string }) {
  const { items, isLoading, pagination, title } = usePagedSearch(kind, query);
  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      navigationTitle={`${title} for “${query}”`}
      searchBarPlaceholder={`Filter ${title.toLowerCase()}…`}
      onSelectionChange={prefetchSelectedPlaylist}
    >
      {uniqueById(items).map((playlist) => (
        <PlaylistListItem key={playlist.id} playlist={playlist} />
      ))}
    </List>
  );
}
