import { Icon, Detail, Color, ActionPanel, Action } from "@raycast/api";
import { ProcessedDeparture } from "../types";
import { formatDepartureTime } from "../utils/dateUtils";

export function DepartureDetails({ departure }: { departure: ProcessedDeparture }) {
  const statusColor = departure.status.toLowerCase().includes("cancel")
    ? Color.Red
    : departure.status.toLowerCase().includes("delay")
      ? Color.Yellow
      : Color.Green;
  const routeColor = departure.routeColor ? `#${departure.routeColor}` : Color.PrimaryText;
  const trackColor = departure.track ? Color.Blue : Color.SecondaryText;

  const markdown = `
# Departure to ${departure.destination}

  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Departure to ${departure.destination}`}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Departure Details"
              content={`Train to ${departure.destination} (${departure.routeLongName || departure.routeShortName}) departing ${formatDepartureTime(departure.departureTime)}. Status: ${departure.status}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Route"
            text={departure.routeShortName || departure.routeLongName}
            icon={{ source: Icon.Train, tintColor: routeColor }}
          />
          <Detail.Metadata.Label
            title="Status"
            text={departure.status}
            icon={{ source: Icon.Clock, tintColor: statusColor }}
          />
          {departure.track && (
            <Detail.Metadata.Label
              title="Track"
              text={departure.track}
              icon={{ source: Icon.Pin, tintColor: trackColor }}
            />
          )}
          <Detail.Metadata.Label
            title="Departure Time"
            text={formatDepartureTime(departure.departureTime)}
            icon={{ source: Icon.Clock, tintColor: Color.PrimaryText }}
          />
          {departure.peakStatus && (
            <Detail.Metadata.Label
              title="Peak Status"
              text={departure.peakStatus || "N/A"}
              icon={{ source: Icon.Ticket, tintColor: Color.PrimaryText }}
            />
          )}
          {departure.destinationBorough && (
            <Detail.Metadata.Label title="Destination" text={departure.destinationBorough} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
