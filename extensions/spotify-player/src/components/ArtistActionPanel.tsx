import { Action, ActionPanel, Icon } from "@raycast/api";
import { ArtistObject, TrackObject } from "../helpers/spotify.api";
import { AlbumsGrid } from "./AlbumsGrid";
import { useArtistAlbums } from "../hooks/useArtistAlbums";
import { useArtistTopTracks } from "../hooks/useArtistTopTracks";
import { TracksList } from "./TracksList";
import { FooterAction } from "./FooterAction";
import { StartRadioAction } from "./StartRadioAction";
import { PlayAction } from "./PlayAction";
import { RefreshAction } from "./RefreshAction";
import { MinimalTrack } from "../api/getMySavedTracks";

type ArtistActionPanelProps = {
  title: string;
  artist: ArtistObject;
  onRefresh?: () => void;
};

function transformTrackToMinimal(track: TrackObject): MinimalTrack {
  return {
    id: track.id || "",
    name: track.name || "",
    artists: track.artists?.map((artist) => ({ name: artist.name || "" })) || [],
    album: {
      id: track.album?.id || "",
      name: track.album?.name || "",
      images: track.album?.images || [],
    },
    uri: track.uri || "",
    duration_ms: track.duration_ms || 0,
  };
}

export function ArtistActionPanel({ title, artist, onRefresh }: ArtistActionPanelProps) {
  const { artistAlbumsData } = useArtistAlbums({ artistId: artist.id });
  const { artistTopTracksData } = useArtistTopTracks({ artistId: artist.id });
  const albums = artistAlbumsData?.items;

  const minimalTracks = artistTopTracksData?.tracks.map(transformTrackToMinimal);

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
      {minimalTracks && (
        <Action.Push icon={Icon.List} title="Show Popular Songs" target={<TracksList tracks={minimalTracks} />} />
      )}
      <StartRadioAction artistId={artist.id} />
      {onRefresh && <RefreshAction onRefresh={onRefresh} />}
      <FooterAction url={artist?.external_urls?.spotify} uri={artist.uri} title={title} />
    </ActionPanel>
  );
}
