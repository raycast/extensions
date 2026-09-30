import { Icon, Keyboard, List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise, useFetch } from "@raycast/utils";
import { PredictionsList } from "./PredictionsList";
import type { Favorite, Route, StopsResponse, Stop } from "../types";
import { appendApiKey, FavoriteService } from "../utils";
import { addFavoriteStop, removeFavoriteStop } from "../lib/stops";
import { useEffect, useState } from "react";

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

  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    setStops(
      data?.data.map((stop) => {
        return {
          ...stop,
          isFavorite: isFavorite(route, directionId, stop),
        };
      }) || []
    );
  }, [isLoading]);

  function isFavorite(route: Route, directionId: number, stop: Stop): boolean {
    return (
      favoriteStops.data?.some(
        (favorite: Favorite) =>
          favorite.route.id === route.id && favorite.directionId === directionId && favorite.stop.id === stop.id
      ) || false
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select origin MBTA stop...">
      {stops.map((stop: Stop) => (
        <List.Item
          key={stop.id}
          title={stop.attributes.name}
          icon={{ source: Icon.CircleFilled, tintColor: route.attributes.color }}
          accessories={[
            { text: stop.attributes.address || stop.attributes.municipality, icon: Icon.Pin },
            { icon: stop.isFavorite ? Icon.Star : null, tooltip: "Saved as Favorite" },
          ]}
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
                title={stop.isFavorite ? "Remove Favorite" : "Add Favorite"}
                icon={stop.isFavorite ? Icon.StarDisabled : Icon.Star}
                shortcut={stop.isFavorite ? Keyboard.Shortcut.Common.Remove : null}
                onAction={() => {
                  stop.isFavorite
                    ? removeFavoriteStop({ route, directionId, stop })
                    : addFavoriteStop(route, directionId, stop);
                  setStops((prevStops): Stop[] => {
                    return (prevStops || []).map((prevStop) => {
                      if (prevStop.id === stop.id) {
                        return {
                          ...prevStop,
                          isFavorite: !prevStop.isFavorite,
                        };
                      } else {
                        return prevStop;
                      }
                    });
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
