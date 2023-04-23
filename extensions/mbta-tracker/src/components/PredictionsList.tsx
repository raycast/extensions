import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import type { PredictionsResponse, Stop } from "../types";

dayjs.extend(relativeTime);

interface Props {
  stop: Stop;
}

export const PredictionsList = ({ stop }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<PredictionsResponse>(
    `https://api-v3.mbta.com/predictions?filter%5Bstop%5D=${stop.id}`
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
