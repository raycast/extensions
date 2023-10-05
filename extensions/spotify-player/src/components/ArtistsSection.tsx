import { Grid } from "@raycast/api";
import { ArtistObject } from "../helpers/spotify.api";
import { ArtistItem } from "./ArtistItem";
import { ListOrGridSection } from "./ListOrGridSection";

type ArtistsSectionProps = {
  type: "list" | "grid";
  limit?: number;
  columns?: number;
  artists: ArtistObject[] | undefined;
};

export function ArtistsSection({ type, artists, columns, limit }: ArtistsSectionProps) {
  if (!artists) return null;

  const items = artists.slice(0, limit || artists.length);

  return (
    <ListOrGridSection type={type} title="Artists" columns={columns} inset={Grid.Inset.Small}>
      {items.map((artist) => (
        <ArtistItem type={type} key={artist.id} artist={artist} />
      ))}
    </ListOrGridSection>
  );
}
