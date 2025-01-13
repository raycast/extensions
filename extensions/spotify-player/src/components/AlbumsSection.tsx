import { SimplifiedAlbumObject } from "../helpers/spotify.api";
import { ListOrGridSection } from "./ListOrGridSection";
import { AlbumItem } from "./AlbumItem";

type AlbumsSectionProps = {
  type: "list" | "grid";
  albums: SimplifiedAlbumObject[] | undefined;
  columns?: number;
  limit?: number;
  onRefresh?: () => void;
};

export function AlbumsSection({ type, albums, columns, limit, onRefresh }: AlbumsSectionProps) {
  if (!albums) return null;

  const items = limit ? albums.slice(0, limit) : albums;

  return (
    <ListOrGridSection type={type} title="Albums" columns={columns}>
      {items.map((album) => (
        <AlbumItem type={type} key={album.id} album={album} onRefresh={onRefresh} />
      ))}
    </ListOrGridSection>
  );
}
