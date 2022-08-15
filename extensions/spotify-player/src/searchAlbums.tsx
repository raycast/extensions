import { Grid, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAlbumSearch } from "./spotify/client";
import { isSpotifyInstalled } from "./utils";
import AlbumGridItem from "./components/AlbumGridItem";

export default function SearchAlbums() {
  const [searchText, setSearchText] = useState<string>();
  const [spotifyInstalled, setSpotifyInstalled] = useState<boolean>(false);
  const response = useAlbumSearch(searchText);

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
    <Grid
      searchBarPlaceholder="Search albums..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
      itemSize={Grid.ItemSize.Large}
    >
      {response.result?.albums.items.map((a) => (
        <AlbumGridItem key={a.id} album={a} spotifyInstalled={spotifyInstalled} />
      ))}
    </Grid>
  );
}
