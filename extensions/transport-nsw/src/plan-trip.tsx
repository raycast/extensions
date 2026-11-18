import { useState, useEffect, useRef } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { searchStops } from "./api";
import { StopLocation, TransportMode } from "./types";
import { TripResults } from "./components/TripResults";
import { useSavedTrips } from "./hooks/useSavedTrips";

type Step = "origin" | "destination";

function getIconForModes(modes?: number[]): string {
  if (!modes || modes.length === 0) {
    return "train.png";
  }
  if (modes.includes(TransportMode.Train)) {
    return "train.png";
  }
  if (modes.includes(TransportMode.Metro)) {
    return "metro.png";
  }
  if (modes.includes(TransportMode.LightRail)) {
    return "light-rail.png";
  }
  return "train.png";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const { savedTrips, removeTrip } = useSavedTrips();

  const [step, setStep] = useState<Step>("origin");
  const [origin, setOrigin] = useState<{ id: string; name: string } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [stops, setStops] = useState<StopLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Debounce search text
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText]);

  // Check for API key
  if (!preferences.apiKey) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Key}
          title="API Key Required"
          description="Please set your Transport NSW API key in the extension preferences."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get API Key" url="https://opendata.transport.nsw.gov.au/" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Search for stops when search text changes
  useEffect(() => {
    const search = async () => {
      if (debouncedSearchText.length < 2) {
        setStops([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchStops(debouncedSearchText);
        // Filter to only show stops with train, metro, or light rail
        const allowedModes: number[] = [TransportMode.Train, TransportMode.Metro, TransportMode.LightRail];
        const stopResults = (response.locations || []).filter((loc) => {
          if (loc.type !== "stop") return false;
          // Check modes array first, then fall back to productClasses
          const modes = loc.modes || loc.productClasses || [];
          if (modes.length > 0) {
            return modes.some((mode) => allowedModes.includes(mode));
          }
          // Fallback: include if name suggests it's a train/metro/light rail station
          const name = (loc.name || "").toLowerCase();
          return name.includes("station") || name.includes("light rail") || name.includes("metro");
        });
        stopResults.sort((a, b) => (b.matchQuality || 0) - (a.matchQuality || 0));
        setStops(stopResults);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to search stops";
        showToast({ style: Toast.Style.Failure, title: "Search Error", message });
        setStops([]);
      } finally {
        setIsLoading(false);
      }
    };

    search();
  }, [debouncedSearchText]);

  const handleSelectStop = (stop: StopLocation) => {
    const stopInfo = {
      id: stop.id,
      name: stop.disassembledName || stop.name,
    };

    if (step === "origin") {
      setOrigin(stopInfo);
      setStep("destination");
      setSearchText("");
      setStops([]);
    } else if (origin) {
      // Navigate to trip results
      push(<TripResults origin={origin} destination={stopInfo} />);
    }
  };

  const handleSelectSavedTrip = (trip: (typeof savedTrips)[0]) => {
    push(<TripResults origin={trip.origin} destination={trip.destination} />);
  };

  const showSearchResults = debouncedSearchText.length >= 2;
  const title = step === "origin" ? "Select Origin" : `From ${origin?.name} → Select Destination`;
  const placeholder = step === "origin" ? "Search for departure station..." : "Search for arrival station...";

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={placeholder}
      navigationTitle={title}
    >
      {step === "origin" && !showSearchResults && savedTrips.length > 0 && (
        <List.Section title="Saved Trips">
          {savedTrips.map((trip) => (
            <List.Item
              key={trip.id}
              icon="train.png"
              title={trip.name}
              actions={
                <ActionPanel>
                  <Action title="View Trip" icon={Icon.Train} onAction={() => handleSelectSavedTrip(trip)} />
                  <Action
                    title="Delete Trip"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      await removeTrip(trip.id);
                      showToast({ style: Toast.Style.Success, title: "Trip Deleted" });
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {!showSearchResults && (
        <List.EmptyView
          icon={step === "origin" ? Icon.Pin : Icon.ArrowRight}
          title={step === "origin" ? "Where are you departing from?" : "Where are you going?"}
          description="Type at least 2 characters to search for a station or stop."
        />
      )}

      {showSearchResults && stops.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Stations Found"
          description="Try a more complete station name (e.g. 'Peters' instead of 'Peter', or 'Central' instead of 'Cent')."
        />
      )}

      {showSearchResults && stops.length > 0 && (
        <List.Section title="Search Results" subtitle={`${stops.length} stations found`}>
          {stops.map((stop) => {
            const displayName = stop.disassembledName || stop.name;
            const subtitle = stop.parent?.name && stop.parent.name !== displayName ? stop.parent.name : undefined;
            const icon = getIconForModes(stop.modes);

            return (
              <List.Item
                key={stop.id}
                icon={icon}
                title={displayName}
                subtitle={subtitle}
                actions={
                  <ActionPanel>
                    <Action
                      title={step === "origin" ? "Select Origin" : "Select Destination"}
                      onAction={() => handleSelectStop(stop)}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
