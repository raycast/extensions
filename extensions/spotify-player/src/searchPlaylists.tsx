import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { usePlaylistSearch } from "./spotify/client";
import PlaylistItem from "./components/PlaylistListItem";
import { SpotifyProvider } from "./utils/context";

function SearchPlaylists() {
  const [searchText, setSearchText] = useState<string>();
  const response = usePlaylistSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <List
      searchBarPlaceholder="Search playlists..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} />
      ))}
    </List>
  );
}

export default () => (
  <SpotifyProvider>
    <SearchPlaylists />
  </SpotifyProvider>
);
