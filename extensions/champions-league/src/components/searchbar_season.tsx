import { Grid, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { getSeasons } from "../api";
import { seasonLabel } from "../utils";

interface Props {
  selected?: string;
  onSelect: (seasonYear: string) => void;
  /** Hide seasons before this season year (e.g. standings only exist from 1992/93). */
  minSeasonYear?: number;
  grid?: boolean;
}

export function useSeasons(minSeasonYear = 0) {
  const {
    data = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getSeasons);
  return {
    seasons: data.filter((s) => Number(s.seasonYear) >= minSeasonYear),
    isLoading,
    error,
    revalidate,
  };
}

export default function SearchBarSeason({
  selected,
  onSelect,
  minSeasonYear,
  grid,
}: Props) {
  const { seasons } = useSeasons(minSeasonYear);

  useEffect(() => {
    if (!selected && seasons.length) {
      onSelect(seasons[0].seasonYear);
    }
  }, [seasons, selected]);

  const Dropdown = grid ? Grid.Dropdown : List.Dropdown;

  return (
    <Dropdown tooltip="Filter by Season" value={selected} onChange={onSelect}>
      {seasons.map((season) => (
        <Dropdown.Item
          key={season.seasonYear}
          value={season.seasonYear}
          title={seasonLabel(season.seasonYear, season.shortName)}
        />
      ))}
    </Dropdown>
  );
}
