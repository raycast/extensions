import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getDepartures, Departure } from "./api";
import {
  formatTime,
  formatCountdown,
  minutesUntil,
  transportIcon,
} from "./utils";

interface Props {
  stopId: string;
  stopName: string;
}

function departureColor(dep: Departure): Color {
  if (dep.cancellation) return Color.Red;
  const mins = minutesUntil(dep.expectedDepartureTime);
  if (mins <= 1) return Color.Orange;
  if (!dep.realtime) return Color.SecondaryText;
  return Color.Green;
}

function departureAccessories(dep: Departure): List.Item.Accessory[] {
  const countdown = formatCountdown(dep.expectedDepartureTime);
  const scheduled = formatTime(dep.aimedDepartureTime);
  const expected = formatTime(dep.expectedDepartureTime);
  const delayed = scheduled !== expected && !dep.cancellation;

  const accessories: List.Item.Accessory[] = [];

  if (dep.quay?.publicCode) {
    accessories.push({
      tag: { value: `Platform ${dep.quay.publicCode}`, color: Color.Blue },
    });
  }

  if (dep.cancellation) {
    accessories.push({ tag: { value: "Cancelled", color: Color.Red } });
  } else if (delayed) {
    accessories.push({
      tag: { value: `Delayed · ${expected}`, color: Color.Orange },
      tooltip: `Scheduled: ${scheduled}`,
    });
  } else {
    accessories.push({
      tag: { value: countdown, color: departureColor(dep) },
      tooltip: `Departs: ${expected}`,
    });
  }

  return accessories;
}

export function DeparturesView({ stopId, stopName }: Props) {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      const data = await getDepartures(stopId);
      setDepartures(data);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load departures",
        message: String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [stopId]);

  const grouped = new Map<string, Departure[]>();
  for (const dep of departures) {
    const key = `${dep.serviceJourney.line.publicCode}||${dep.destinationDisplay.frontText}||${dep.serviceJourney.line.transportMode}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(dep);
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={stopName}
      searchBarPlaceholder="Filter by line or destination..."
    >
      {departures.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No departures"
          description="No departures in the next hour."
        />
      ) : (
        Array.from(grouped.entries()).map(([key, deps]) => {
          const first = deps[0];
          const mode = first.serviceJourney.line.transportMode;
          const lineCode = first.serviceJourney.line.publicCode;
          const destination = first.destinationDisplay.frontText;
          const icon = transportIcon(mode);

          const upcomingTimes = deps
            .slice(0, 4)
            .map((d) => formatCountdown(d.expectedDepartureTime))
            .join("  ·  ");

          return (
            <List.Item
              key={key}
              icon={icon}
              title={`${lineCode}  →  ${destination}`}
              subtitle={upcomingTimes}
              accessories={departureAccessories(first)}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={load}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
