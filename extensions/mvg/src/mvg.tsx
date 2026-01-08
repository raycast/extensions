import { useState, useEffect } from "react";
import { List, showToast, Toast, Color, Icon, ActionPanel, Action, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

interface Departure {
  plannedDepartureTime: number;
  realtime: boolean;
  delayInMinutes: number;
  realtimeDepartureTime: number;
  transportType: string;
  label: string;
  destination: string;
  cancelled: boolean;
  platform: number;
  platformChanged: boolean;
  occupancy: string;
}

interface Station {
  latitude: number;
  longitude: number;
  place: string;
  name: string;
  globalId: string;
  divaId: number;
  hasZoomData: boolean;
  transportTypes: string[];
  aliases: string;
  tariffZones: string;
  type: string;
}

interface UserStation {
  globalId: string;
  name: string;
}

const MVG_DEPARTURES_URL = "https://www.mvg.de/api/bgw-pt/v3/departures";
const MVG_LOCATIONS_URL = "https://www.mvg.de/api/bgw-pt/v3/locations";

const DEFAULT_STATION = {
  globalId: "de:09162:2", // Marienplatz main station
  name: "Marienplatz",
};

function formatDepartureTime(timestamp: number): string {
  const now = Date.now();
  const diffInMinutes = Math.floor((timestamp - now) / (1000 * 60));

  if (diffInMinutes <= 0) {
    return "Now";
  } else if (diffInMinutes === 1) {
    return "1 min";
  } else {
    return `${diffInMinutes} min`;
  }
}

function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLineIcon(label: string, transportType: string): Icon {
  switch (transportType.toLowerCase()) {
    case "ubahn":
      return Icon.Train;
    case "sbahn":
      return Icon.Train;
    case "bus":
      return Icon.Car;
    case "tram":
      return Icon.Train;
    default:
      return Icon.Train;
  }
}

function getTransportTypeDisplayName(transportType: string): string {
  switch (transportType.toLowerCase()) {
    case "ubahn":
      return "U-Bahn";
    case "sbahn":
      return "S-Bahn";
    case "bus":
      return "Bus";
    case "tram":
      return "Tram";
    default:
      return transportType;
  }
}

export default function Command() {
  const { push, pop } = useNavigation();
  const { value: homeStation, setValue: setHomeStation } = useLocalStorage<UserStation>(
    "mvg-home-station",
    DEFAULT_STATION,
  );
  const { value: workStation, setValue: setWorkStation } = useLocalStorage<UserStation>("mvg-work-station", {
    globalId: "de:09162:1",
    name: "Hauptbahnhof",
  });

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState(homeStation || DEFAULT_STATION);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Station setting handlers
  const handleSetHomeStation = (station: UserStation) => {
    setHomeStation(station);
    showToast({
      style: Toast.Style.Success,
      title: "Home Station Set",
      message: `Set ${station.name} as your home station`,
    });
    pop();
  };

  const handleSetWorkStation = (station: UserStation) => {
    setWorkStation(station);
    showToast({
      style: Toast.Style.Success,
      title: "Work Station Set",
      message: `Set ${station.name} as your work station`,
    });
    pop();
  };

  // Station selection component
  function StationSelectionForm({
    stationType,
    onStationSelected,
  }: {
    stationType: "home" | "work";
    onStationSelected: (station: UserStation) => void;
  }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Station[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const searchForStations = async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`${MVG_LOCATIONS_URL}?query=${encodeURIComponent(query)}`);
        if (response.ok) {
          const results = await response.json();
          setSearchResults(results.slice(0, 10));
        }
      } catch (error) {
        console.error("Error searching stations:", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Search failed",
          message: "Unable to search for stations",
        });
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      const timeoutId = setTimeout(() => {
        searchForStations(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder={`Search for ${stationType} station...`}
        onSearchTextChange={setSearchQuery}
        searchText={searchQuery}
      >
        {searchResults.map((station) => (
          <List.Item
            key={station.globalId}
            title={station.name}
            subtitle={station.place}
            icon={
              station.transportTypes?.includes("UBAHN")
                ? Icon.Train
                : station.transportTypes?.includes("SBAHN")
                  ? Icon.Train
                  : station.transportTypes?.includes("TRAM")
                    ? Icon.Train
                    : Icon.Car
            }
            actions={
              <ActionPanel>
                <Action
                  title={`Set as ${stationType === "home" ? "Home" : "Work"} Station`}
                  onAction={() => {
                    const userStation: UserStation = {
                      globalId: station.globalId,
                      name: station.name,
                    };
                    onStationSelected(userStation);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {searchQuery && searchResults.length === 0 && !isLoading && (
          <List.EmptyView title="No stations found" description={`Try searching with a different term`} />
        )}
      </List>
    );
  }

  const searchStations = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setStations([]);
      return;
    }

    try {
      const response = await fetch(`${MVG_LOCATIONS_URL}?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data: Station[] = await response.json();
      setStations(data.filter((station) => station.type === "STATION"));
    } catch (error) {
      console.error("Failed to search stations:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to search stations",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const fetchDepartures = async () => {
    try {
      setIsLoading(true);
      const url = `${MVG_DEPARTURES_URL}?globalId=${selectedStation.globalId}&limit=20&transportTypes=UBAHN,SBAHN,BUS,TRAM&offsetInMinutes=5`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: Departure[] = await response.json();
      setDepartures(data);
    } catch (error) {
      console.error("Failed to fetch departures:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load departures",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartures();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDepartures, 30000);
    return () => clearInterval(interval);
  }, [selectedStation]);

  const StationDropdown = () => {
    const showUserStations = !searchQuery.trim();

    return (
      <List.Dropdown
        tooltip="Select Station"
        value={selectedStation.globalId}
        onChange={(newValue) => {
          const station =
            stations.find((s) => s.globalId === newValue) ||
            (newValue === homeStation?.globalId ? homeStation : null) ||
            (newValue === workStation?.globalId ? workStation : null);
          if (station) {
            setSelectedStation({ globalId: station.globalId, name: station.name });
          }
        }}
        onSearchTextChange={searchStations}
        throttle={true}
      >
        {showUserStations && homeStation && workStation && (
          <List.Dropdown.Section title="Quick Access">
            <List.Dropdown.Item title={homeStation.name} value={homeStation.globalId} icon={Icon.House} />
            <List.Dropdown.Item title={workStation.name} value={workStation.globalId} icon={Icon.Building} />
          </List.Dropdown.Section>
        )}
        {stations.length > 0 && (
          <List.Dropdown.Section title={showUserStations ? "All Stations" : "Search Results"}>
            {stations.slice(0, 20).map((station) => (
              <List.Dropdown.Item
                key={station.globalId}
                title={station.name}
                value={station.globalId}
                icon={
                  station.transportTypes?.includes("UBAHN")
                    ? Icon.Train
                    : station.transportTypes?.includes("SBAHN")
                      ? Icon.Train
                      : station.transportTypes?.includes("TRAM")
                        ? Icon.Train
                        : Icon.Car
                }
              />
            ))}
          </List.Dropdown.Section>
        )}
      </List.Dropdown>
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search departures..." searchBarAccessory={<StationDropdown />}>
      {departures.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No departures found"
          description="No upcoming departures available at this station"
          icon={Icon.Train}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Station Settings">
                <Action
                  title="Set Home Station"
                  icon={Icon.House}
                  onAction={() =>
                    push(<StationSelectionForm stationType="home" onStationSelected={handleSetHomeStation} />)
                  }
                />
                <Action
                  title="Set Work Station"
                  icon={Icon.Building}
                  onAction={() =>
                    push(<StationSelectionForm stationType="work" onStationSelected={handleSetWorkStation} />)
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Refresh">
                <Action title="Refresh Departures" icon={Icon.ArrowClockwise} onAction={fetchDepartures} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ) : (
        // Group departures by transport type
        ["UBAHN", "SBAHN", "TRAM", "BUS"].map((transportType) => {
          const transportDepartures = departures.filter((d) => d.transportType === transportType);

          if (transportDepartures.length === 0) return null;

          return (
            <List.Section
              key={transportType}
              title={getTransportTypeDisplayName(transportType)}
              subtitle={`${transportDepartures.length} departure${transportDepartures.length === 1 ? "" : "s"}`}
            >
              {transportDepartures.map((departure, index) => {
                const departureTime = formatDepartureTime(departure.realtimeDepartureTime);
                const absoluteTime = formatAbsoluteTime(departure.realtimeDepartureTime);
                const isDelayed = departure.delayInMinutes > 0;
                const isCancelled = departure.cancelled;

                let subtitle = `Platform ${departure.platform} • ${absoluteTime}`;
                if (isDelayed) {
                  subtitle += ` • +${departure.delayInMinutes} min delay`;
                }
                if (isCancelled) {
                  subtitle = "CANCELLED";
                }

                const accessories = [
                  {
                    text: departure.occupancy,
                    icon: Icon.Person,
                    tooltip: `Occupancy: ${departure.occupancy}`,
                  },
                  {
                    text: departureTime,
                    icon: Icon.Clock,
                    tooltip: `Departure: ${absoluteTime}${isDelayed ? ` (+${departure.delayInMinutes} min)` : ""}`,
                  },
                ];

                return (
                  <List.Item
                    key={`${departure.label}-${departure.destination}-${index}`}
                    title={`${departure.label} → ${departure.destination}`}
                    subtitle={subtitle}
                    icon={{
                      source: getLineIcon(departure.label, departure.transportType),
                      tintColor: isCancelled ? Color.Red : isDelayed ? Color.Orange : Color.Blue,
                    }}
                    accessories={accessories}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section title="Station Settings">
                          <Action
                            title="Set Home Station"
                            icon={Icon.House}
                            onAction={() =>
                              push(<StationSelectionForm stationType="home" onStationSelected={handleSetHomeStation} />)
                            }
                          />
                          <Action
                            title="Set Work Station"
                            icon={Icon.Building}
                            onAction={() =>
                              push(<StationSelectionForm stationType="work" onStationSelected={handleSetWorkStation} />)
                            }
                          />
                        </ActionPanel.Section>
                        <ActionPanel.Section title="Refresh">
                          <Action title="Refresh Departures" icon={Icon.ArrowClockwise} onAction={fetchDepartures} />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        })
      )}
    </List>
  );
}
