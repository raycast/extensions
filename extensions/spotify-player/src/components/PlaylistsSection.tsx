import { SimplifiedPlaylistObject } from "../helpers/spotify.api";
import { ListOrGridSection } from "./ListOrGridSection";
import PlaylistItem from "./PlaylistItem";
import PlaylistLikedTracksItem from "./PlaylistLikedTracksItem";
import { MinimalTrack } from "../api/getMySavedTracks";

type PlaylistsSectionProps = {
  type: "list" | "grid";
  playlists: SimplifiedPlaylistObject[] | undefined;
  columns?: number;
  limit?: number;
  tracks?: {
    items: MinimalTrack[];
    total: number;
  };
  onRefresh?: () => void;
};

export function PlaylistsSection({ type, playlists, columns, limit, tracks, onRefresh }: PlaylistsSectionProps) {
  if (!playlists) return null;

  const items = playlists.slice(0, limit || playlists.length);

  return (
    <ListOrGridSection type={type} title="Playlists" columns={columns}>
      <PlaylistLikedTracksItem type={type} key="likedSongs" tracks={tracks} onRefresh={onRefresh} />
      {items.map((playlist) => (
        <PlaylistItem type={type} key={playlist.id} playlist={playlist} onRefresh={onRefresh} />
      ))}
    </ListOrGridSection>
  );
}
