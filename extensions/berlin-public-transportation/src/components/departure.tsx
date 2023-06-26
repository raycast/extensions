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
      keywords={[departure.line.mode, departure.direction]}
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
      title={[departure.line?.name].join(" ")}
      subtitle={departure.direction}
      icon={TRANSPORT_MODE_TO_ICON[departure.line.mode]}
      accessories={getDepartureAccessories(departure)}
    />
  );
}
