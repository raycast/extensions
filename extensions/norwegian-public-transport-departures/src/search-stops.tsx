import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { searchStops, StopPlace } from "./api";
import { DeparturesView } from "./departures";

export default function SearchStops() {
  const { fylke } = getPreferenceValues<Preferences.SearchStops>();
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<StopPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setStops([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchStops(query, fylke);
        if (!controller.signal.aborted) setStops(results);
      } catch (err) {
        if (!controller.signal.aborted) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: String(err),
          });
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
      setIsLoading(false);
    };
  }, [query, fylke]);

  const placeholder =
    fylke === "all"
      ? "Search for a stop anywhere in Norway..."
      : `Search for a stop in ${fylke}...`;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={placeholder}
      throttle={false}
    >
      {stops.length === 0 && !isLoading && query.trim() === "" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for a stop"
          description="Type the name of a bus stop, metro station, or train station."
        />
      ) : (
        stops.map((stop) => (
          <List.Item
            key={stop.id}
            icon="🚏"
            title={stop.name}
            subtitle={[stop.locality, stop.county].filter(Boolean).join(", ")}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Departures"
                  icon={Icon.Clock}
                  target={<DeparturesView stopId={stop.id} stopName={stop.name} />}
                />

              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
