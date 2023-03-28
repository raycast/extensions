import { Action, ActionPanel, Icon, showHUD } from "@raycast/api";
import { ArtistObject } from "../helpers/spotify.api";
import { AlbumsGrid } from "./AlbumsGrid";
import { useArtistAlbums } from "../hooks/useArtistAlbums";
import { play } from "../api/play";
import { startRadio } from "../api/startRadio";
import { useArtistTopTracks } from "../hooks/useArtistTopTracks";
import { TracksList } from "./TracksList";
import { FooterAction } from "./FooterAction";

type ArtistActionPanelProps = {
  title: string;
  artist: ArtistObject;
};

export function ArtistActionPanel({ title, artist }: ArtistActionPanelProps) {
  const { artistAlbumsData } = useArtistAlbums({ artistId: artist.id });
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
      <FooterAction url={artist?.external_urls?.spotify} uri={artist.uri} title={title} />
    </ActionPanel>
  );
}
