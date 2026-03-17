import { useState } from "react";
import { ActionPanel, Action, List, Icon, Image } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { BootstrapResponse, PlaceEntry, CONTINENT_NAMES, CONTINENT_ORDER } from "./types";
import EventsList from "./events-list";

function AreaDropdown(props: { onAreaChange: (newValue: string) => void }) {
  return (
    <List.Dropdown tooltip="Select Area" storeValue={true} onChange={props.onAreaChange}>
      <List.Dropdown.Item key="all" title="All Areas" value="all" />
      <List.Dropdown.Section title="Continents">
        {CONTINENT_ORDER.map((continent) => (
          <List.Dropdown.Item key={continent} title={CONTINENT_NAMES[continent] || continent} value={continent} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

export default function DiscoverEvents() {
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const { isLoading, data, error } = useFetch<BootstrapResponse>("https://api2.luma.com/discover/bootstrap-page");

  // Group places by continent
  const placesByContinent = new Map<string, PlaceEntry[]>();

  if (data?.places) {
    for (const entry of data.places) {
      const continent = entry.place.geo_continent;
      if (!placesByContinent.has(continent)) {
        placesByContinent.set(continent, []);
      }
      placesByContinent.get(continent)!.push(entry);
    }
  }

  // Filter continents based on selected area
  const continentsToShow = selectedArea === "all" ? CONTINENT_ORDER : [selectedArea];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search places..."
      searchBarAccessory={<AreaDropdown onAreaChange={setSelectedArea} />}
    >
      {error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to load places" description={error.message} />
      )}

      {continentsToShow.map((continent) => {
        const places = placesByContinent.get(continent);
        if (!places || places.length === 0) return null;

        return (
          <List.Section
            key={continent}
            title={CONTINENT_NAMES[continent] || continent}
            subtitle={`${places.length} locations`}
          >
            {places.map((entry) => (
              <List.Item
                key={entry.place.api_id}
                icon={{
                  source: entry.place.icon_url,
                  tintColor: entry.place.tint_color,
                  mask: Image.Mask.RoundedRectangle,
                }}
                title={entry.place.name}
                subtitle={`${entry.event_count} events`}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Events"
                      icon={Icon.Calendar}
                      target={<EventsList slug={entry.place.slug} placeName={entry.place.name} />}
                    />
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={`https://luma.com/discover/${entry.place.slug}`}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
