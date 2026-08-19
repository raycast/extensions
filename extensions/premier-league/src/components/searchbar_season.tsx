import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getSeasons } from "../api";
import { Season } from "../types";

export const useSeasonSelection = () => {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>();
  const { data: seasons = [], isLoading } = usePromise(getSeasons);

  return {
    seasonId: selectedSeasonId ?? seasons[0]?.seasonId,
    setSeasonId: setSelectedSeasonId,
    seasons,
    isLoading,
  };
};

export default function SearchBarSeason(props: {
  selected?: string;
  onSelect: React.Dispatch<React.SetStateAction<string | undefined>>;
  seasons: Season[];
  isLoading: boolean;
}) {
  return (
    <List.Dropdown
      tooltip="Filter by Season"
      value={props.selected}
      onChange={props.onSelect}
      isLoading={props.isLoading}
    >
      {props.seasons.map((season) => {
        return (
          <List.Dropdown.Item
            key={season.seasonId}
            value={season.seasonId}
            title={season.label}
          />
        );
      })}
    </List.Dropdown>
  );
}
