import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { PredictionsResponse, Stop } from "../types";
import { appendApiKey } from "../utils";

dayjs.extend(relativeTime);

interface Props {
  directionId: string;
  routeId: string;
  stop: Stop;
}

export const PredictionsList = ({ stop, directionId, routeId }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<PredictionsResponse>(
    appendApiKey(
      `https://api-v3.mbta.com/predictions?filter%5Broute%5D=${routeId}&filter%5Bdirection_id%5D=${directionId}&filter%5Bstop%5D=${stop.id}`
    )
  );

  return (
    <List isLoading={isLoading}>
      {(data?.data || [])
        .filter((prediction) => prediction.attributes.arrival_time !== null)
        .map((prediction) => (
          <List.Item key={prediction.id} title={dayjs(prediction.attributes.arrival_time).fromNow() || "Unknown"} />
        ))}
    </List>
  );
};
