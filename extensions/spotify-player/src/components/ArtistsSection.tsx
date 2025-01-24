import { ArtistObject } from "../helpers/spotify.api";
import ArtistItem from "./ArtistItem";
import { ListOrGridSection } from "./ListOrGridSection";

type ArtistsSectionProps = {
  type: "list" | "grid";
  artists: ArtistObject[] | undefined;
  columns?: number;
  limit?: number;
  onRefresh?: () => void;
};

export function ArtistsSection({ type, artists, columns, limit, onRefresh }: ArtistsSectionProps) {
  if (!artists) return null;

  const items = limit ? artists.slice(0, limit) : artists;

  return (
    <ListOrGridSection type={type} title="Artists" columns={columns}>
      {items.map((artist) => (
        <ArtistItem type={type} key={artist.id} artist={artist} onRefresh={onRefresh} />
      ))}
    </ListOrGridSection>
  );
}
