import { ArtistItem } from "./ArtistItem";
import { ListOrGridSection } from "./ListOrGridSection";

export function ArtistsSection({
  type,
  artists,
  columns,
  limit,
}: {
  type: "list" | "grid";
  limit?: number;
  columns: number;
  artists: SpotifyApi.ArtistObjectFull[] | undefined;
}) {
  if (!artists) return null;

  const items = artists.slice(0, limit || artists.length);

  return (
    <ListOrGridSection type={type} title="Artists" columns={columns}>
      {items.map((a) => (
        <ArtistItem type={type} key={a.id} artist={a} />
      ))}
    </ListOrGridSection>
  );
}
