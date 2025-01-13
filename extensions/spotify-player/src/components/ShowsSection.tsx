import { SimplifiedShowObject } from "../helpers/spotify.api";
import { ListOrGridSection } from "./ListOrGridSection";
import { ShowItem } from "./ShowItem";

type ShowsSectionProps = {
  type: "list" | "grid";
  shows: SimplifiedShowObject[] | undefined;
  columns?: number;
  limit?: number;
  onRefresh?: () => void;
};

export function ShowsSection({ type, shows, columns, limit, onRefresh }: ShowsSectionProps) {
  if (!shows) return null;

  const items = limit ? shows.slice(0, limit) : shows;

  return (
    <ListOrGridSection type={type} title="Shows" columns={columns}>
      {items.map((show) => (
        <ShowItem type={type} key={show.id} show={show} onRefresh={onRefresh} />
      ))}
    </ListOrGridSection>
  );
}
