// src/components/StationDepartures.tsx
import { useState, useEffect, useCallback } from "react";
import { List, ActionPanel, Action, Icon, showToast, Toast, Color, getPreferenceValues } from "@raycast/api";
import { fetchDepartures } from "../utils/api";
import { ProcessedDeparture, Station } from "../types";
import { formatDepartureTime, getCopyContent } from "../utils/dateUtils";
import { DepartureDetails } from "./DepartureDetails";
import ViewAlertsCommand from "../view-alerts";

// Define interface for preferences
interface DeparturePreferences {
  defaultDepartureWindow: string;
}

const departureWindowOptions = [
  { title: "Next 10 Mins", value: "10" },
  { title: "Next 30 Mins", value: "30" },
  { title: "Next Hour", value: "60" },
  { title: "Next 2 Hours", value: "120" },
  { title: "All Day", value: "0" },
];

interface StationDeparturesProps {
  station: Station;
}

function getStatusAccessory(status: string): List.Item.Accessory {
  const lowerStatus = status.toLowerCase() || "";
  if (lowerStatus.includes("delay")) {
    return { text: status, icon: { source: Icon.Clock, tintColor: Color.Yellow } };
  }
  if (lowerStatus.includes("cancel")) {
    return { text: status, icon: { source: Icon.XMarkCircle, tintColor: Color.Red } };
  }
  if (lowerStatus.includes("on time")) {
    return { text: "On Time", icon: { source: Icon.CheckCircle, tintColor: Color.Green } };
  }
  return { text: status }; // Default
}

export default function StationDepartures({ station }: StationDeparturesProps) {
  // --- Read Preference ---
  const preferences = getPreferenceValues<DeparturePreferences>();
  const defaultWindow = preferences.defaultDepartureWindow || "30"; // Fallback if not set

  // --- State ---
  const [departures, setDepartures] = useState<ProcessedDeparture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // *** Initialize state FROM preference ***
  const [selectedWindow, setSelectedWindow] = useState<string>(defaultWindow);

  // --- Fetching Logic ---
  const fetchAndSetDepartures = useCallback(
    async (windowMinutes: number) => {
      setIsLoading(true);
      try {
        const fetchedDepartures = await fetchDepartures(station.id, windowMinutes);
        setDepartures(fetchedDepartures);
      } catch (error) {
        showToast(
          Toast.Style.Failure,
          "Failed to load departures",
          error instanceof Error ? error.message : "Unknown error",
        );
        setDepartures([]);
      } finally {
        setIsLoading(false);
      }
    },
    [station.id],
  ); // Depend on station ID

  // --- Effect to fetch when window changes ---
  useEffect(() => {
    fetchAndSetDepartures(parseInt(selectedWindow, 10));
  }, [selectedWindow, fetchAndSetDepartures]);

  // --- Manual Refresh ---
  const handleRefresh = useCallback(() => {
    showToast(Toast.Style.Animated, "Refreshing departures...");
    fetchAndSetDepartures(parseInt(selectedWindow, 10))
      .then(() => {
        showToast(Toast.Style.Success, "Departures Refreshed");
      })
      .catch(() => {
        // Error already shown in fetchAndSetDepartures
      });
  }, [selectedWindow, fetchAndSetDepartures]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search departures..."
      navigationTitle={`${station.name} Departures`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Departure Time Window"
          storeValue={false} // Don't store this instance's value globally
          value={selectedWindow}
          onChange={setSelectedWindow}
        >
          <List.Dropdown.Section title="Show Departures For">
            {departureWindowOptions.map((opt) => (
              <List.Dropdown.Item key={opt.value} title={opt.title} value={opt.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        // Actions on the list itself (e.g., when empty)
        <ActionPanel>
          <Action title="Refresh Departures" icon={Icon.ArrowClockwise} onAction={handleRefresh} />
        </ActionPanel>
      }
    >
      {departures.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Departures Found"
          description={`No departures found for ${station.name} in the selected time window.`}
        />
      ) : // LIRR/MNR: Separate Arrivals (where departure's station name matches current station)
      station.system === "LIRR" || station.system === "MNR" ? (
        // Group all, but use 'Arrivals' as group for arrivals and always sort it last
        Object.entries(
          departures.reduce(
            (boroughAcc, dep) => {
              const groupKey = dep.destination === station.name ? "Arrivals" : dep.destinationBorough || "Outbound";
              if (!boroughAcc[groupKey]) boroughAcc[groupKey] = [];
              boroughAcc[groupKey].push(dep);
              return boroughAcc;
            },
            {} as Record<string, ProcessedDeparture[]>,
          ),
        )
          // Sort: Outbound first, Arrivals last, others alphabetical
          .sort(([a], [b]) => {
            if (a === "Outbound") return -1;
            if (b === "Outbound") return 1;
            if (a === "Arrivals") return 1;
            if (b === "Arrivals") return -1;
            return a.localeCompare(b);
          })
          .map(([borough, boroughDepartures]) => (
            <List.Section key={borough} title={borough === "Arrivals" ? "Arrivals" : `${borough}`}>
              {boroughDepartures
                .slice()
                .sort((a, b) => {
                  if (!a.departureTime && !b.departureTime) return 0;
                  if (!a.departureTime) return 1;
                  if (!b.departureTime) return -1;
                  return a.departureTime.getTime() - b.departureTime.getTime();
                })
                .map((dep, index) => (
                  <List.Item
                    key={`${dep.tripId || index}-${dep.departureTime?.toISOString?.() || dep.departureTime || "no-time"}`}
                    title={borough === "Arrivals" ? dep.destination || "Unknown Destination" : dep.destination}
                    icon={{ source: Icon.Train, tintColor: borough === "Arrivals" ? Color.Green : Color.PrimaryText }}
                    accessories={[
                      ...(dep.routeShortName && dep.routeLongName && dep.routeLongName !== ""
                        ? [
                            {
                              tag: {
                                value:
                                  dep.system === "SUBWAY"
                                    ? `${dep.routeShortName}: ${dep.routeLongName}`
                                    : dep.routeLongName,
                                color: {
                                  light: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                  dark: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                  adjustContrast: true,
                                },
                              },
                            },
                          ]
                        : dep.routeLongName && dep.routeLongName !== ""
                          ? [
                              {
                                tag: {
                                  value: dep.routeLongName,
                                  color: {
                                    light: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                    dark: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                    adjustContrast: true,
                                  },
                                },
                              },
                            ]
                          : []),
                      ...(dep.track ? [{ text: `Track ${dep.track}`, icon: Icon.Pin }] : []),
                      ...(dep.peakStatus === "Peak"
                        ? [
                            {
                              tag: {
                                value: dep.peakStatus,
                                color: {
                                  light: Color.Orange,
                                  dark: Color.Orange,
                                  adjustContrast: true,
                                },
                              },
                            },
                          ]
                        : []),
                      { text: formatDepartureTime(dep.departureTime), icon: Icon.Clock },
                      getStatusAccessory(dep.status),
                    ]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action.Push
                            title="Show Departure Details"
                            icon={Icon.Info}
                            target={<DepartureDetails departure={dep} />}
                          />
                          <Action
                            title="Refresh Departures"
                            icon={Icon.ArrowClockwise}
                            onAction={() => handleRefresh()}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                          />
                          <Action.Push
                            title={`View Active Alerts for ${dep.system === "SUBWAY" ? dep.routeShortName || dep.routeLongName : "This Route"}`}
                            icon={Icon.Bell}
                            target={<ViewAlertsCommand initialFilterLines={[`${dep.system}-${dep.routeId}`]} />}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section>
                          <Action.CopyToClipboard
                            title="Copy Departure Info"
                            content={getCopyContent(dep)}
                            shortcut={{ modifiers: ["cmd"], key: "." }}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          ))
      ) : (
        // Default: Original grouping for other systems
        Object.entries(
          departures.reduce(
            (boroughAcc, dep) => {
              const borough =
                station.system === "SUBWAY" ? dep.direction || "Unknown" : dep.destinationBorough || "Outbound";
              if (!boroughAcc[borough]) boroughAcc[borough] = [];
              boroughAcc[borough].push(dep);
              return boroughAcc;
            },
            {} as Record<string, ProcessedDeparture[]>,
          ),
        )
          // Sort Outbound first for LIRR/MNR, else alphabetical
          .sort(([a], [b]) => {
            if (station.system === "LIRR" || station.system === "MNR") {
              if (a === "Outbound") return -1;
              if (b === "Outbound") return 1;
              return 0;
            }
            return a.localeCompare(b);
          })
          .map(([borough, boroughDepartures]) => (
            <List.Section key={borough} title={borough}>
              {boroughDepartures
                .slice()
                .sort((a, b) => {
                  if (!a.departureTime && !b.departureTime) return 0;
                  if (!a.departureTime) return 1;
                  if (!b.departureTime) return -1;
                  return a.departureTime.getTime() - b.departureTime.getTime();
                })
                .map((dep, index) => (
                  <List.Item
                    key={`${dep.tripId || index}-${dep.departureTime?.toISOString?.() || dep.departureTime || "no-time"}`}
                    title={dep.destination || "Unknown"}
                    icon={{ source: Icon.Train, tintColor: Color.PrimaryText }}
                    accessories={[
                      ...(dep.routeShortName && dep.routeLongName && dep.routeLongName !== ""
                        ? [
                            {
                              tag: {
                                value:
                                  dep.system === "SUBWAY"
                                    ? `${dep.routeShortName}: ${dep.routeLongName}`
                                    : dep.routeLongName,
                                color: {
                                  light: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                  dark: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                  adjustContrast: true,
                                },
                              },
                            },
                          ]
                        : dep.routeLongName && dep.routeLongName !== ""
                          ? [
                              {
                                tag: {
                                  value: dep.system === "SUBWAY" ? dep.routeLongName : dep.routeLongName,
                                  color: {
                                    light: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                    dark: dep.routeColor ? `#${dep.routeColor}` : Color.SecondaryText,
                                    adjustContrast: true,
                                  },
                                },
                              },
                            ]
                          : []),
                      ...(dep.track ? [{ text: `Track ${dep.track}`, icon: Icon.Pin }] : []),
                      ...(dep.peakStatus === "Peak"
                        ? [
                            {
                              tag: {
                                value: dep.peakStatus,
                                color: {
                                  light: Color.Orange,
                                  dark: Color.Orange,
                                  adjustContrast: true,
                                },
                              },
                            },
                          ]
                        : []),
                      { text: formatDepartureTime(dep.departureTime), icon: Icon.Clock },
                      getStatusAccessory(dep.status),
                    ]}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          <Action.Push
                            title="Show Departure Details"
                            icon={Icon.Info}
                            target={<DepartureDetails departure={dep} />}
                          />
                          <Action
                            title="Refresh Departures"
                            icon={Icon.ArrowClockwise}
                            onAction={handleRefresh}
                            shortcut={{ modifiers: ["cmd"], key: "r" }}
                          />
                          <Action.Push
                            title={`View Active Alerts for ${dep.system === "SUBWAY" ? dep.routeShortName || dep.routeLongName : "This Route"}`}
                            icon={Icon.Bell}
                            target={<ViewAlertsCommand initialFilterLines={[`${dep.system}-${dep.routeId}`]} />}
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section>
                          <Action.CopyToClipboard
                            title="Copy Departure Info"
                            content={getCopyContent(dep)}
                            shortcut={{ modifiers: ["cmd"], key: "." }}
                          />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                ))}
            </List.Section>
          ))
      )}
    </List>
  );
}
