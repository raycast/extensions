import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PredictionsList } from "./PredictionsList";
import type { Route, StopsResponse } from "../types";
import { appendApiKey } from "../utils";

interface Props {
  route: Route;
  directionId: string;
}

export const StopsList = ({ route, directionId }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<StopsResponse>(
    appendApiKey(`https://api-v3.mbta.com/stops?filter%5Broute%5D=${route.id}&direction_id=${directionId}`)
  );

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
                title="Choose Stop"
                icon={Icon.Clock}
                target={
                  <PredictionsList
                    key={stop.id}
                    stop={stop}
                    directionId={directionId}
                    route={route}
                    destination={route.attributes.direction_destinations[parseInt(directionId)]}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
