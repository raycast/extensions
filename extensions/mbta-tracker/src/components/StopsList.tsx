import { Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { Route, StopsResponse } from "../types";

interface Props {
  route: Route;
}

export const StopsList = ({ route }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<StopsResponse>(`https://api-v3.mbta.com/stops?filter%5Broute%5D=${route.id}`);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Select MBTA stop...">
      {(data?.data || []).map((stop) => (
        <List.Item
          key={stop.id}
          title={stop.attributes.name}
          icon={{ source: Icon.CircleFilled, tintColor: route.attributes.color }}
          accessories={[{ text: stop.attributes.address || stop.attributes.municipality, icon: Icon.Pin }]}
        />
      ))}
    </List>
  );
};
