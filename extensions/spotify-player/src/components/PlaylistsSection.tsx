import { ListOrGridSection } from "./ListOrGridSection";
import PlaylistItem from "./PlaylistItem";

export function PlaylistsSection({
  playlists,
  type,
  columns,
  limit,
}: {
  playlists: SpotifyApi.PlaylistObjectSimplified[] | undefined;
  type: "list" | "grid";
  columns: number;
  limit?: number;
}) {
  if (!playlists) return null;

  const items = playlists.slice(0, limit || playlists.length);

  return (
    <ListOrGridSection type={type} title="Playlists" columns={columns}>
      {items.map((a) => (
        <PlaylistItem key={a.id} playlist={a} type={type} />
      ))}
    </ListOrGridSection>
  );
}
