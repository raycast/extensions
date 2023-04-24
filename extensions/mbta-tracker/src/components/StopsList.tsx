import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { PredictionsList } from "./PredictionsList";
import type { Route, StopsResponse } from "../types";

interface Props {
  route: Route;
  directionId: string;
}

export const StopsList = ({ route, directionId }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<StopsResponse>(
    `https://api-v3.mbta.com/stops?filter%5Broute%5D=${route.id}&direction_id=${directionId}`
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select MBTA stop...">
      {(data?.data || []).map((stop) => (
        <List.Item
          key={stop.id}
          title={stop.attributes.name}
          icon={{ source: Icon.CircleFilled, tintColor: route.attributes.color }}
          accessories={[{ text: stop.attributes.address || stop.attributes.municipality, icon: Icon.Pin }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Predictions"
                icon={Icon.Clock}
                target={<PredictionsList key={stop.id} stop={stop} directionId={directionId} routeId={route.id} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
};
