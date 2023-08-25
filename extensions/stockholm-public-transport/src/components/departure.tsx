import { IDeparture } from "../types";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { TRANSPORT_MODE_TO_ICON } from "../lib/constants";
import { getDepartureAccessories } from "../lib/departures";

interface DepartureProps {
  departure: IDeparture;
  onRefresh: () => void;
}

export default function Departure({ onRefresh, departure }: DepartureProps) {
  return (
    <List.Item
      keywords={[departure.TransportMode, departure.Destination]}
      actions={
        <ActionPanel>
          <Action
            shortcut={{ key: "r", modifiers: ["cmd"] }}
            icon={Icon.ArrowClockwise}
            title="Refresh"
            onAction={onRefresh}
          />
        </ActionPanel>
      }
      title={[departure.LineNumber, departure.JourneyDirection === 1 ? "↑" : "↓"].join(" ")}
      subtitle={departure.Destination}
      icon={TRANSPORT_MODE_TO_ICON[departure.TransportMode]}
      accessories={getDepartureAccessories(departure)}
    />
  );
}
