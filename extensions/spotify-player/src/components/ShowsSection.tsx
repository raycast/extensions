import { ListOrGridSection } from "./ListOrGridSection";
import { ShowItem } from "./ShowItem";
import { SimplifiedShowObject } from "../helpers/spotify.api";

type ShowsSectionProps = {
  type: "list" | "grid";
  shows: (SimplifiedShowObject | null | undefined)[] | undefined;
  columns?: number;
  limit?: number;
};

export function ShowsSection({ type, shows, columns, limit }: ShowsSectionProps) {
  if (!shows) return null;

  const filtered = shows.filter((show): show is SimplifiedShowObject => Boolean(show?.id));
  const items = filtered.slice(0, limit || filtered.length);

  if (!items.length) return null;

  return (
    <ListOrGridSection type={type} title="Podcasts & Shows" columns={columns}>
      {items.map((show) => (
        <ShowItem type={type} key={show.id} show={show} />
      ))}
    </ListOrGridSection>
  );
}
