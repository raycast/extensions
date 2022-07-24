import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useGetCategoryPlaylists } from "./spotify/client";
import { isSpotifyInstalled } from "./utils";
import PlaylistItem from "./components/PlaylistListItem";

export default function CategoryPlaylist({ category }: { category: SpotifyApi.CategoryObject }) {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean>(false);
  const response = useGetCategoryPlaylists(category.id);

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
      navigationTitle={category.name}
      isLoading={response.isLoading}
      throttle
      enableFiltering
    >
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} spotifyInstalled={spotifyInstalled} />
      ))}
    </List>
  );
}
