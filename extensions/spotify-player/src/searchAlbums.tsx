import { Action, ActionPanel, Grid, Image, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { isSpotifyInstalled } from "./client/utils";
import { PlayAction } from "./actions";
import { useAlbumSearch } from "./client/client";

export default function SpotifyList() {
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
        <AlbumItem key={a.id} album={a} spotifyInstalled={spotifyInstalled} />
      ))}
    </Grid>
  );
}

function AlbumItem(props: { album: SpotifyApi.AlbumObjectSimplified; spotifyInstalled: boolean }) {
  const album = props.album;
  const spotifyInstalled = props.spotifyInstalled;
  const icon: Image.ImageLike = {
    source: album.images[0]?.url,
  };

  const title = album.name;
  const subtitle = `${album.artists.map((a) => a.name).join(", ")} • ${album.release_date.substring(
    0,
    4
  )} • ${album.total_tracks.toString()} songs`;
  return (
    <Grid.Item
      title={title}
      subtitle={subtitle}
      content={icon}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={album.uri} />
          <Action.OpenInBrowser
            title={`Show Album (${album.name.trim()})`}
            url={spotifyInstalled ? `spotify:album:${album.id}` : album.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Show Artist"
            url={spotifyInstalled ? `spotify:artist:${album.artists[0].id}` : album.artists[0].external_urls.spotify}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={album.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
