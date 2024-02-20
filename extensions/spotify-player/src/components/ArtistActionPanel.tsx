import { Action, ActionPanel, Icon } from "@raycast/api";
import { ArtistObject } from "../helpers/spotify.api";
import { AlbumsGrid } from "./AlbumsGrid";
import { useArtistAlbums } from "../hooks/useArtistAlbums";
import { useArtistTopTracks } from "../hooks/useArtistTopTracks";
import { TracksList } from "./TracksList";
import { FooterAction } from "./FooterAction";
import { StartRadioAction } from "./StartRadioAction";
import { PlayAction } from "./PlayAction";

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
      <PlayAction id={artist.id as string} type="artist" />
      {albums && (
        <Action.Push
          icon={Icon.AppWindowGrid3x3}
          title="Show Albums"
          target={<AlbumsGrid albums={albums} title={artist.name} />}
        />
      )}
      {artistTopTracksData && (
        <Action.Push
          icon={Icon.List}
          title="Show Popular Songs"
          target={<TracksList tracks={artistTopTracksData.tracks} />}
        />
      )}
      <StartRadioAction artistId={artist.id} />
      <FooterAction url={artist?.external_urls?.spotify} uri={artist.uri} title={title} />
    </ActionPanel>
  );
}
