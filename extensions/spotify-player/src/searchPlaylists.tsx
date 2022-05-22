import { Action, ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { PlayAction } from "./actions";
import { usePlaylistSearch } from "./client/client";
import { isSpotifyInstalled } from "./client/utils";

export default function SpotifyList() {
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

function PlaylistItem(props: { playlist: SpotifyApi.PlaylistObjectSimplified; spotifyInstalled: boolean }) {
  const playlist = props.playlist;

  const spotifyInstalled = props.spotifyInstalled;
  const imageURL = playlist.images[playlist.images.length - 1]?.url;
  const icon: Image.ImageLike = {
    source: imageURL ?? Icon.TextDocument,
    mask: Image.Mask.Circle,
  };

  const title = playlist.name;
  const subtitle = playlist.owner.display_name;
  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      accessories={[{ text: `${playlist.tracks.total.toString()} songs`, tooltip: "number of tracks" }]}
      icon={icon}
      actions={
        <ActionPanel title={title}>
          <PlayAction itemURI={playlist.uri} />
          <Action.OpenInBrowser
            title={`Show Playlist (${playlist.name.trim()})`}
            url={spotifyInstalled ? `spotify:playlist:${playlist.id}` : playlist.external_urls.spotify}
            icon={icon}
            shortcut={{ modifiers: ["cmd"], key: "a" }}
          />
          <Action.OpenInBrowser
            title="Show Artist"
            url={spotifyInstalled ? `spotify:artist:${playlist.owner.id}` : playlist.owner.external_urls.spotify}
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={playlist.external_urls.spotify}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}
