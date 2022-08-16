import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { usePlaylistSearch } from "./spotify/client";
import { isSpotifyInstalled } from "./utils";
import PlaylistItem from "./components/PlaylistListItem";

export default function SearchPlaylists() {
  const [searchText, setSearchText] = useState<string>();
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean>(false);
  const response = usePlaylistSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  useEffect(() => {
    async function checkForSpotify() {
      const spotifyIsInstalled = await isSpotifyInstalled();

      setSpotifyInstalled(spotifyIsInstalled);
    }

    checkForSpotify();
  }, []);

  return (
    <List
      searchBarPlaceholder="Search playlists..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} spotifyInstalled={spotifyInstalled} />
      ))}
    </List>
  );
}
