import AlbumGridItem from "./AlbumGridItem";
import { ListOrGridSection } from "./ListOrGridSection";

export function AlbumsSection({
  type,
  albums,
  columns,
  limit,
}: {
  type: "list" | "grid";
  limit?: number;
  columns: number;
  albums: SpotifyApi.AlbumObjectSimplified[] | undefined;
}) {
  if (!albums) return null;

  const items = albums.slice(0, limit || albums.length);

  return (
    <ListOrGridSection type={type} title="Albums" columns={columns}>
      {items.map((a) => (
        <AlbumGridItem type={type} key={a.id} album={a} />
      ))}
    </ListOrGridSection>
  );
}
