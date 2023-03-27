import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { ArtistObject } from "../helpers/spotify.api";
import { isSpotifyInstalled } from "../helpers/isSpotifyInstalled";
import { AlbumsGrid } from "./AlbumsGrid";
import { useArtistAlbums } from "../hooks/useArtistAlbums";
import { play } from "../api/play";
import { startRadio } from "../api/startRadio";
import { useArtistTopTracks } from "../hooks/useArtistTopTracks";
import { TracksList } from "./TracksList";

type ArtistActionPanelProps = {
  title: string;
  artist: ArtistObject;
};

export function ArtistActionPanel({ title, artist }: ArtistActionPanelProps) {
  const { artistAlbumsData } = useArtistAlbums({ artistId: artist.id, limit: 24 });
  const { artistTopTracksData } = useArtistTopTracks({ artistId: artist.id });
  const albums = artistAlbumsData?.items;

  return (
    <ActionPanel>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          await play({ id: artist.id, type: "artist" });
          await showHUD(`Playing ${title}`);
        }}
      />
      {artistTopTracksData && (
        <Action.Push
          icon={Icon.List}
          title="Show Popular Songs"
          target={<TracksList tracks={artistTopTracksData.tracks} />}
        />
      )}
      {albums && (
        <Action.Push icon={Icon.AppWindowGrid3x3} title="Show Albums" target={<AlbumsGrid albums={albums} />} />
      )}
      <Action
        icon={Icon.Music}
        title="Start Radio"
        onAction={async () => {
          await startRadio({ artistIds: [artist.id as string] });
          showHUD(`Playing ${artist.name} Radio`);
        }}
      />
      <ActionPanel.Section>
        <Action.CopyToClipboard
          icon={Icon.Link}
          title="Copy URL"
          content={{
            html: `<a href="${artist?.external_urls?.spotify}" title="${title}">${title}</a>`,
            text: artist?.external_urls?.spotify,
          }}
        />
        {isSpotifyInstalled ? (
          <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={artist?.uri || "spotify"} />
        ) : (
          <Action.OpenInBrowser
            title="Open on Spotify Web"
            url={artist?.external_urls?.spotify || "https://play.spotify.com"}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
