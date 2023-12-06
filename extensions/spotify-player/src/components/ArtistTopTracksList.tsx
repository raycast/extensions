import { List } from "@raycast/api";
import TrackListItem from "./TrackListItem";
import { useArtistTopTracks } from "../hooks/useArtistTopTracks";
import { ArtistObject } from "../helpers/spotify.api";

type ArtistTopTracksListProps = {
  artist: ArtistObject;
};

export function ArtistTopTracksList({ artist }: ArtistTopTracksListProps) {
  const { artistTopTracksData } = useArtistTopTracks({ artistId: artist.id });
  const tracks = artistTopTracksData?.tracks ?? [];
  return (
    <List searchBarPlaceholder="Search top songs">
      {tracks?.map((track, index) => (
        <TrackListItem key={`${track.id}${index}`} track={track} album={track.album} showGoToAlbum={true} />
      ))}
    </List>
  );
}
