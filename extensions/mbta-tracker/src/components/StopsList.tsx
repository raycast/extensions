import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import type { StopsResponse } from "../types";

interface Props {
  routeId: string;
}

export const StopsList = ({ routeId }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<StopsResponse>(`https://api-v3.mbta.com/stops?filter%5Broute%5D=${routeId}`);

  return (
    <List isLoading={isLoading} throttle>
      {(data?.data || []).map((item) => (
        <List.Item key={item.id} title={item.attributes.name} />
      ))}
    </List>
  );
};
