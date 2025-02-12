import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { AlertsList } from "./AlertsList";
import type { AlertRelationship, PredictionsResponse, Route, Stop } from "../types";
import { appendApiKey } from "../utils";

dayjs.extend(relativeTime);

interface Props {
  directionId: number;
  route: Route;
  stop: Stop;
  destination: string;
}

export const PredictionsList = ({ stop, directionId, route, destination }: Props): JSX.Element => {
  const { isLoading, data } = useFetch<PredictionsResponse>(
    appendApiKey(
      `https://api-v3.mbta.com/predictions?filter%5Broute%5D=${route.id}&filter%5Bdirection_id%5D=${directionId}&filter%5Bstop%5D=${stop.id}&sort=departure_time&include=alerts&fields%5Bprediction%5D=departure_time,direction_id`
    )
  );

  const alertIds = data?.data
    .map((prediction) => prediction.relationships.alerts.data.map((alert: AlertRelationship) => alert.id))
    .flat();

  return (
    <List isLoading={isLoading}>
      <List.Section title={stop.attributes.name}>
        {(data?.data || [])
          .filter((prediction) => prediction.attributes.departure_time !== null)
          .map((prediction) => (
            <List.Item
              key={prediction.id}
              title={dayjs(prediction.attributes.departure_time).fromNow() || "Unknown"}
              accessories={[
                { tag: { value: route.id, color: route.attributes.color }, tooltip: "Route" },
                { text: destination, icon: Icon.Pin, tooltip: "Destination" },
                {
                  text: dayjs(prediction.attributes.departure_time).format("ddd, h:mm:ss A"),
                  icon: Icon.Clock,
                  tooltip: "Departure Time",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={`https://www.mbta.com/schedules/${route.id}/line?schedule_direction%5Bdirection_id%5D=1&&schedule_finder%5Bdirection_id%5D=${directionId}&schedule_finder%5Borigin%5D=${stop.id}`}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <AlertsList key={alertIds?.toString()} alertIds={alertIds}></AlertsList>
    </List>
  );
};
