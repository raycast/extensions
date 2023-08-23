import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { PredictionsList } from "./PredictionsList";
import type { Favorite, Route, StopsResponse, Stop } from "../types";
import { appendApiKey, FavoriteService } from "../utils";
import { addFavoriteStop, removeFavoriteStop } from "../lib/stops";

interface Props {
  route: Route;
  directionId: number;
}

export const StopsList = ({ route, directionId }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<StopsResponse>(
    appendApiKey(
      `https://api-v3.mbta.com/stops?filter%5Broute%5D=${route.id}&direction_id=${directionId}&fields%5Bstop%5D=address,municipality,name`
    )
  );

  const favoriteStops = useCachedPromise(FavoriteService.favorites);

  function isFavorite(route: Route, directionId: number, stop: Stop): boolean | undefined {
    return favoriteStops.data?.some(
      (favorite: Favorite) =>
        favorite.route.id === route.id && favorite.directionId === directionId && favorite.stop.id === stop.id
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select origin MBTA stop...">
      {(data?.data || []).map((stop) => (
        <List.Item
          key={stop.id}
          title={stop.attributes.name}
          icon={{ source: Icon.CircleFilled, tintColor: route.attributes.color }}
          accessories={[{ text: stop.attributes.address || stop.attributes.municipality, icon: Icon.Pin }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Departures"
                icon={Icon.Clock}
                target={
                  <PredictionsList
                    key={stop.id}
                    stop={stop}
                    directionId={directionId}
                    route={route}
                    destination={route.attributes.direction_destinations[directionId]}
                  />
                }
              />
              <Action
                title={isFavorite(route, directionId, stop) ? "Remove Favorite" : "Add Favorite"}
                icon={Icon.Star}
                onAction={() => {
                  isFavorite(route, directionId, stop)
                    ? removeFavoriteStop({ route, directionId, stop })
                    : addFavoriteStop(route, directionId, stop);
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
