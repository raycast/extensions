import { ListOrGridSection } from "./ListOrGridSection";
import { AlbumItem } from "./AlbumItem";
import { SimplifiedAlbumObject } from "../helpers/spotify.api";

type AlbumsSectionProps = {
  type: "list" | "grid";
  albums: SimplifiedAlbumObject[] | undefined;
  columns?: number;
  limit?: number;
};

export function AlbumsSection({ type, albums, columns, limit }: AlbumsSectionProps) {
  if (!albums) return null;

  const items = albums.slice(0, limit || albums.length);

  return (
    <ListOrGridSection type={type} title="Albums" columns={columns}>
      {items.map((album) => (
        <AlbumItem type={type} key={album.id} album={album} />
      ))}
    </ListOrGridSection>
  );
}
