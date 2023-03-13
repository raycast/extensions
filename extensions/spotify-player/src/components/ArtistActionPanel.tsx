import { Action, ActionPanel, Color, Icon, showHUD } from "@raycast/api";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { AlbumsGrid } from "./AlbumsGrid";
import { useArtistAlbums } from "../hooks/useArtistAlbums";
import { play } from "../api/play";
import { startRadio } from "../api/startRadio";

type ArtistActionPanelProps = {
  title: string;
  artist: SpotifyApi.ArtistObjectFull;
};

export function ArtistActionPanel({ title, artist }: ArtistActionPanelProps) {
  const { artistAlbumsData } = useArtistAlbums({ artistId: artist.id, limit: 24 });

  const albums = artistAlbumsData?.items;

  return (
    <ActionPanel title={title}>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          await play({ contextUri: artist.uri });
          showHUD(`Playing ${title}`);
        }}
      />
      {albums && (
        <Action.Push icon={Icon.AppWindowGrid3x3} title="Discography" target={<AlbumsGrid albums={albums} />} />
      )}
      <Action
        icon={{ source: "radio.png", tintColor: Color.PrimaryText }}
        title="Start Radio"
        onAction={async () => {
          const artistId = artist.id.replace("spotify:artist:", "");
          await startRadio({ artistIds: [artistId] });
          showHUD(`Playing ${artist.name} Radio`);
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action.CopyToClipboard
        icon={Icon.Link}
        title="Copy URL"
        content={{
          html: `<a href="${artist.external_urls.spotify}" title="${title}">${title}</a>`,
          text: artist.external_urls.spotify,
        }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      <Action.OpenInBrowser
        icon="icon.png"
        title="Open on Spotify"
        url={isSpotifyInstalled ? `spotify:artist:${artist.id}` : artist.external_urls.spotify}
      />
    </ActionPanel>
  );
}
