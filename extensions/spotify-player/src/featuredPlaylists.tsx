import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useGetFeaturedPlaylists } from "./spotify/client";
import { isSpotifyInstalled } from "./utils";
import PlaylistItem from "./components/PlaylistListItem";

export default function FeaturedPlaylists() {
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean>(false);
  const response = useGetFeaturedPlaylists();

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
    <List isLoading={response.isLoading} throttle>
      {response.result?.playlists.items.map((p) => (
        <PlaylistItem key={p.id} playlist={p} spotifyInstalled={spotifyInstalled} />
      ))}
    </List>
  );
}
