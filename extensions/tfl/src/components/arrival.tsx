import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { IArrival } from "../types";

interface ArrivalProps {
  arrival: IArrival;
  onRefresh: () => void;
}

export default function Arrival({ arrival, onRefresh }: ArrivalProps) {
  const arrivalDate = new Date(arrival.expectedArrival);
  const isArrivalNow = arrivalDate === new Date();
  const arrivalTime = isArrivalNow
    ? "NOW"
    : arrivalDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
      });

  return (
    <List.Item
      title={`${arrival.lineName} on ${arrival.platformName}`}
      icon={Icon.Train}
      accessories={[
        {
          tag: {
            value: arrivalTime,
            color: isArrivalNow ? Color.Green : Color.PrimaryText,
          },
        },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}
