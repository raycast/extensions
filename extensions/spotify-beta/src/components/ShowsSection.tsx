import { ListOrGridSection } from "./ListOrGridSection";
import { ShowItem } from "./ShowItem";
import { SimplifiedShowObject } from "../helpers/spotify.api";

type ShowsSectionProps = {
  type: "list" | "grid";
  shows: SimplifiedShowObject[] | undefined;
  columns?: number;
  limit?: number;
};

export function ShowsSection({ type, shows, columns, limit }: ShowsSectionProps) {
  if (!shows) return null;

  const items = shows.slice(0, limit || shows.length);

  return (
    <ListOrGridSection type={type} title="Podcasts & Shows" columns={columns}>
      {items.map((show) => (
        <ShowItem type={type} key={show.id} show={show} />
      ))}
    </ListOrGridSection>
  );
}
