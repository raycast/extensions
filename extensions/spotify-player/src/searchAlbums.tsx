import { Grid, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useAlbumSearch } from "./spotify/client";
import AlbumGridItem from "./components/AlbumGridItem";
import { SpotifyProvider } from "./utils/context";

function SearchAlbums() {
  const [searchText, setSearchText] = useState<string>();
  const response = useAlbumSearch(searchText);

  if (response.error) {
    showToast(Toast.Style.Failure, "Search has failed", response.error);
  }

  return (
    <Grid
      searchBarPlaceholder="Search albums..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
      itemSize={Grid.ItemSize.Large}
    >
      {response.result?.albums.items.map((a) => (
        <AlbumGridItem key={a.id} album={a} />
      ))}
    </Grid>
  );
}

export default () => (
  <SpotifyProvider>
    <SearchAlbums />
  </SpotifyProvider>
);
