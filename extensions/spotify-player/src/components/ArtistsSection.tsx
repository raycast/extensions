import { ArtistItem } from "./ArtistItem";
import { ListOrGridSection } from "./ListOrGridSection";

type ArtistsSectionProps = {
  type: "list" | "grid";
  limit?: number;
  columns: number;
  artists: SpotifyApi.ArtistObjectFull[] | undefined;
};

export function ArtistsSection({ type, artists, columns, limit }: ArtistsSectionProps) {
  if (!artists) return null;

  const items = artists.slice(0, limit || artists.length);

  return (
    <ListOrGridSection type={type} title="Artists" columns={columns}>
      {items.map((artist) => (
        <ArtistItem type={type} key={artist.id} artist={artist} />
      ))}
    </ListOrGridSection>
  );
}
