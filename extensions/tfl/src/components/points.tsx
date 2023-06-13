import { Icon, List } from "@raycast/api";
import { ReactNode, useState } from "react";
import { getStopPoints } from "../lib/api";
import { IStopPoint } from "../types";
import Point from "./point";
import useSWR from "swr";
import { addStopPointToFavorites, getFavoriteStopPoints, removeStopPointFromFavorites } from "../lib/points";

interface PointsProps {
  onSelectPoint: (stopPoint: IStopPoint) => ReactNode;
}

export default function Points({ onSelectPoint }: PointsProps) {
  const [search, setSearch] = useState<string>("");

  const { data: stopPoints, isLoading: isStopPointsLoading } = useSWR("stop-points", getStopPoints);

  const { data: favouriteStopPoints, mutate } = useSWR("favourite-stop-points", getFavoriteStopPoints);

  const handleToggleFavourite = async (stopPoint: IStopPoint) => {
    const isFavourite = favouriteStopPoints?.some(({ naptanId }) => naptanId === stopPoint.naptanId);

    if (isFavourite) {
      await removeStopPointFromFavorites(stopPoint);
    } else {
      await addStopPointToFavorites(stopPoint);
    }

    mutate();
  };

  return (
    <List
      navigationTitle="Stop Points"
      isLoading={isStopPointsLoading}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search for a stop point (eg: London City)"
    >
      {stopPoints &&
        stopPoints
          .filter((point) => point.commonName.toLowerCase().includes(search.toLowerCase()))
          .map((point) => {
            const isFavorite = favouriteStopPoints?.some(({ naptanId }) => naptanId === point.naptanId);

            return (
              <Point
                isFavorite={isFavorite}
                onSelect={onSelectPoint}
                onToggleFavorite={() => handleToggleFavourite(point)}
                stopPoint={point}
                key={[point.name, point.commonName, point.naptanId].join("-")}
              />
            );
          })}

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="Not found"
        description={`There is no stop point with name "${search}"`}
      />
    </List>
  );
}
