import { ActionPanel, Action, List, Icon, Color, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import { planTrip, Journey } from "../api";
import { TransportMode } from "../types";
import { useSavedTrips } from "../hooks/useSavedTrips";

interface TripResultsProps {
  origin: { id: string; name: string };
  destination: { id: string; name: string };
  dateTime?: Date;
  isArrival?: boolean;
}

// Official Transport NSW line colors
const LINE_COLORS: Record<string, string> = {
  // Sydney Metro
  M1: "#168388",

  // Sydney Trains
  T1: "#F99D1C",
  T2: "#0098CD",
  T3: "#F37021",
  T4: "#005AA3",
  T5: "#C4258F",
  T6: "#7C3E21",
  T7: "#6F818E",
  T8: "#00954C",
  T9: "#D11F2F",

  // Intercity Trains
  BMT: "#F99D1C", // Blue Mountains
  CCN: "#D11F2F", // Central Coast & Newcastle
  HUN: "#833134", // Hunter
  SCO: "#005AA3", // South Coast
  SHL: "#00954C", // Southern Highlands

  // Regional Trains
  TRAIN: "#F6891F",

  // Sydney Light Rail
  L1: "#BE1622",
  L2: "#DD1E25",
  L3: "#781140",
  L4: "#BB2043",

  // Newcastle Light Rail
  NLR: "#EE343F",
};

function getIconForMode(productClass?: number): string {
  switch (productClass) {
    case TransportMode.Train:
      return "train.png";
    case TransportMode.Metro:
      return "metro.png";
    case TransportMode.LightRail:
      return "light-rail.png";
    default:
      return "train.png";
  }
}

function getLineInfo(transportation?: {
  disassembledName?: string;
  number?: string;
  name?: string;
  product?: { class: number };
}): { label: string; color: string; icon: string } {
  if (!transportation) {
    return { label: "", color: Color.SecondaryText, icon: "train.png" };
  }

  const lineName = transportation.disassembledName || "";
  const lineUpper = lineName.toUpperCase();
  const icon = getIconForMode(transportation.product?.class);

  // Check for known line colors
  if (LINE_COLORS[lineUpper]) {
    return { label: lineName, color: LINE_COLORS[lineUpper], icon };
  }

  // Check by prefix (T1-T9, M1, L1-L3)
  const prefix = lineUpper.match(/^(T\d|M\d|L\d)/)?.[1];
  if (prefix && LINE_COLORS[prefix]) {
    return { label: lineName, color: LINE_COLORS[prefix], icon };
  }

  // Fallback by transport mode
  const productClass = transportation.product?.class;
  switch (productClass) {
    case TransportMode.Train:
      return { label: lineName || "Train", color: "#F6891F", icon };
    case TransportMode.Metro:
      return { label: lineName || "Metro", color: "#168388", icon };
    case TransportMode.LightRail:
      return { label: lineName || "Light Rail", color: "#BE1622", icon };
    default:
      return { label: lineName || "", color: Color.SecondaryText, icon };
  }
}

function formatTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

function formatTimeUntil(isoString?: string): string {
  if (!isoString) return "";
  const departureTime = new Date(isoString);
  const now = new Date();
  const diffMs = departureTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) {
    return "Due";
  }
  if (diffMins === 1) {
    return "1 min";
  }
  if (diffMins < 60) {
    return `${diffMins} min`;
  }
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) {
    return hours === 1 ? "1 hr" : `${hours} hrs`;
  }
  return `${hours} hr ${mins} min`;
}

export function TripResults({ origin, destination, dateTime, isArrival }: TripResultsProps) {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { savedTrips, addTrip, removeTrip, isTripSaved } = useSavedTrips();

  const loadTrips = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await planTrip(origin.id, destination.id, { dateTime, isArrival });
      // Filter to only rail journeys (no bus, coach, ferry, school bus)
      const allowedModes: number[] = [TransportMode.Train, TransportMode.Metro, TransportMode.LightRail];
      const railOnly = (response.journeys || []).filter((journey) => {
        // Check all transport legs - exclude if any leg uses non-rail transport
        return journey.legs.every((leg) => {
          if (!leg.transportation) return true; // Walking legs are fine
          const mode = leg.transportation.product?.class;
          return mode === undefined || allowedModes.includes(mode);
        });
      });
      // Sort by departure time (soonest first)
      const sorted = railOnly.sort((a, b) => {
        const aTime = a.legs[0]?.origin.departureTimePlanned || "";
        const bTime = b.legs[0]?.origin.departureTimePlanned || "";
        return aTime.localeCompare(bTime);
      });
      setJourneys(sorted);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load trips";
      setError(message);
      showToast({
        style: Toast.Style.Failure,
        title: "Error Loading Trips",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [origin.id, destination.id]);

  const handleSaveTrip = async () => {
    if (isTripSaved(origin.id, destination.id)) {
      const existing = savedTrips.find((t) => t.origin.id === origin.id && t.destination.id === destination.id);
      if (existing) {
        await removeTrip(existing.id);
        showToast({ style: Toast.Style.Success, title: "Removed from Saved Trips" });
      }
    } else {
      await addTrip({
        name: `${origin.name} → ${destination.name}`,
        origin: { id: origin.id, name: origin.name },
        destination: { id: destination.id, name: destination.name },
      });
      showToast({ style: Toast.Style.Success, title: "Saved Trip" });
    }
  };

  const isSaved = isTripSaved(origin.id, destination.id);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${origin.name} → ${destination.name}`}
      searchBarPlaceholder="Filter trips..."
    >
      {error && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading Trips"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={loadTrips} />
            </ActionPanel>
          }
        />
      )}

      {!error && journeys.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Train}
          title="No Trips Found"
          description="No trips found for this route at the selected time."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={loadTrips} />
            </ActionPanel>
          }
        />
      )}

      {journeys.map((journey, index) => {
        const firstLeg = journey.legs[0];
        const lastLeg = journey.legs[journey.legs.length - 1];
        const departTime = formatTime(firstLeg?.origin.departureTimePlanned);
        const arriveTime = formatTime(lastLeg?.destination.arrivalTimePlanned);
        const timeUntil = formatTimeUntil(firstLeg?.origin.departureTimePlanned);
        const platform = firstLeg?.origin.properties?.platformName;

        // Calculate delay (estimated vs planned)
        const plannedTime = firstLeg?.origin.departureTimePlanned;
        const estimatedTime = firstLeg?.origin.departureTimeEstimated;
        let delayMins = 0;
        if (plannedTime && estimatedTime) {
          delayMins = Math.round((new Date(estimatedTime).getTime() - new Date(plannedTime).getTime()) / 60000);
        }

        // Get line info from first transport leg
        const firstTransportLeg = journey.legs.find((leg) => leg.transportation);
        const lineInfo = getLineInfo(firstTransportLeg?.transportation);
        const finalDest = firstTransportLeg?.transportation?.destination?.name;
        const subtitle = finalDest ? `${lineInfo.label} → ${finalDest}` : lineInfo.label;

        // Calculate total duration
        const durationMins = Math.round(
          (new Date(lastLeg?.destination.arrivalTimePlanned || "").getTime() -
            new Date(firstLeg?.origin.departureTimePlanned || "").getTime()) /
            60000,
        );

        const accessories: List.Item.Accessory[] = [];

        // Platform
        if (platform) {
          accessories.push({ tag: { value: platform, color: lineInfo.color } });
        }

        // Delay/early indicator
        if (delayMins > 0) {
          accessories.push({ tag: { value: `${delayMins} min late`, color: Color.Red } });
        } else if (delayMins < 0) {
          accessories.push({ tag: { value: `${Math.abs(delayMins)} min early`, color: Color.Orange } });
        }

        // Time until departure (on the right)
        accessories.push({ text: timeUntil });

        return (
          <List.Item
            key={index}
            icon={lineInfo.icon}
            title={`${departTime} → ${arriveTime} (${formatDuration(durationMins)})`}
            subtitle={subtitle}
            accessories={accessories}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Journey Details"
                  icon={Icon.List}
                  target={<JourneyDetails journey={journey} />}
                />
                <Action
                  title={isSaved ? "Remove from Saved Trips" : "Save Trip"}
                  icon={isSaved ? Icon.StarDisabled : Icon.Star}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  onAction={handleSaveTrip}
                />
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={loadTrips} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function JourneyDetails({ journey }: { journey: Journey }) {
  const now = new Date();

  return (
    <List navigationTitle="Journey Details">
      {journey.legs.map((leg, legIndex) => {
        const isWalk = !leg.transportation;

        if (isWalk) {
          const durationMins = Math.round((leg.duration || 0) / 60);
          return (
            <List.Item
              key={`walk-${legIndex}`}
              icon={{ source: Icon.Footprints, tintColor: Color.SecondaryText }}
              title={`Walk ${formatDuration(durationMins)}`}
              subtitle={`${leg.origin.disassembledName || leg.origin.name} → ${leg.destination.disassembledName || leg.destination.name}`}
            />
          );
        }

        const lineInfo = getLineInfo(leg.transportation);
        const destination = leg.transportation?.destination?.name || "";
        const sectionTitle = destination ? `${lineInfo.label} → ${destination}` : lineInfo.label;

        // Build stop list
        const stops: Array<{
          name: string;
          time?: string;
          platform?: string;
          isOrigin: boolean;
          isDestination: boolean;
          isPast: boolean;
        }> = [];

        if (leg.stopSequence && leg.stopSequence.length > 0) {
          leg.stopSequence.forEach((stop, stopIndex) => {
            const isFirst = stopIndex === 0;
            const isLast = stopIndex === leg.stopSequence!.length - 1;
            const stopTime = isLast
              ? stop.arrivalTimePlanned || stop.arrivalTimeEstimated
              : stop.departureTimePlanned || stop.departureTimeEstimated;
            const stopDate = stopTime ? new Date(stopTime) : null;
            const isPast = stopDate ? stopDate < now : false;

            const stationName =
              stop.parent?.disassembledName || stop.disassembledName?.split(",")[0] || stop.name.split(",")[0];

            stops.push({
              name: stationName,
              time: formatTime(stopTime),
              platform: stop.properties?.platformName,
              isOrigin: isFirst,
              isDestination: isLast,
              isPast,
            });
          });
        } else {
          const originTime = leg.origin.departureTimePlanned;
          const destTime = leg.destination.arrivalTimePlanned;

          stops.push({
            name: leg.origin.disassembledName || leg.origin.name,
            time: formatTime(originTime),
            platform: leg.origin.properties?.platformName,
            isOrigin: true,
            isDestination: false,
            isPast: originTime ? new Date(originTime) < now : false,
          });

          stops.push({
            name: leg.destination.disassembledName || leg.destination.name,
            time: formatTime(destTime),
            platform: leg.destination.properties?.platformName,
            isOrigin: false,
            isDestination: true,
            isPast: destTime ? new Date(destTime) < now : false,
          });
        }

        return (
          <List.Section
            key={`leg-${legIndex}`}
            title={sectionTitle}
            subtitle={lineInfo.label ? `Line ${lineInfo.label}` : undefined}
          >
            {stops.map((stop, stopIndex) => {
              let stopIcon: { source: Icon; tintColor: string | Color };

              if (stop.isOrigin) {
                stopIcon = { source: Icon.ArrowRight, tintColor: Color.Green };
              } else if (stop.isDestination) {
                stopIcon = { source: Icon.CheckCircle, tintColor: Color.Green };
              } else if (stop.isPast) {
                stopIcon = { source: Icon.Circle, tintColor: Color.SecondaryText };
              } else {
                stopIcon = { source: Icon.Circle, tintColor: lineInfo.color };
              }

              const accessories: List.Item.Accessory[] = [];

              if (stop.platform) {
                accessories.push({ tag: { value: stop.platform, color: Color.Blue } });
              }

              if (stop.time) {
                accessories.push({
                  text: {
                    value: stop.time,
                    color: stop.isPast ? Color.SecondaryText : undefined,
                  },
                });
              }

              return (
                <List.Item
                  key={`stop-${legIndex}-${stopIndex}`}
                  icon={stopIcon}
                  title={stop.name}
                  accessories={accessories}
                  actions={
                    <ActionPanel>
                      <Action.CopyToClipboard
                        title="Copy Stop Info"
                        content={`${stop.time} - ${stop.name}`}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
