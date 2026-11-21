import { Action, ActionPanel, environment, Icon, Keyboard, List } from "@raycast/api";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { useMemo, useState } from "react";
import { createAirportIndex, searchAirports, type Airport } from "./search";

const data: { airports: Airport[]; updatedAt: string } = JSON.parse(
  readFileSync(join(environment.assetsPath, "airports.json"), "utf8"),
);
const airportIndex = createAirportIndex(data.airports);
const PAGE_SIZE = 100;

export default function SearchAirports() {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const airports = useMemo(() => searchAirports(airportIndex, query), [query]);

  return (
    <List
      searchBarPlaceholder="Search IATA code, airport, or city…"
      filtering={false}
      onSearchTextChange={(text) => {
        setQuery(text);
        setVisibleCount(PAGE_SIZE);
      }}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visibleCount < airports.length,
        onLoadMore: () => setVisibleCount((count) => count + PAGE_SIZE),
      }}
    >
      <List.EmptyView
        icon={Icon.Airplane}
        title="No airports found"
        description="Try a three-letter code such as LHR, an airport name, or a city."
      />
      <List.Section
        title={query.trim() ? "Matching Airports" : "All Airports"}
        subtitle={`${airports.length.toLocaleString()} · OurAirports · ${data.updatedAt}`}
      >
        {airports.slice(0, visibleCount).map((airport) => (
          <List.Item
            key={airport.id}
            id={airport.id}
            icon={Icon.Airplane}
            title={airport.iata}
            subtitle={airport.name}
            accessories={[
              ...(airport.type === "closed" ? [{ tag: "Closed" }] : []),
              { text: [airport.city, airport.country].filter(Boolean).join(", ") },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy IATA Code" content={airport.iata} />
                <Action.CopyToClipboard title="Copy Airport Name" content={airport.name} />
                <Action.CopyToClipboard
                  title="Copy Airport Details"
                  content={`${airport.iata} — ${airport.name}\n${[airport.city, airport.country].filter(Boolean).join(", ")}${airport.icao ? `\nICAO: ${airport.icao}` : ""}`}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                />
                <Action.OpenInBrowser
                  title="View on OurAirports"
                  url={`https://ourairports.com/airports/${encodeURIComponent(airport.id)}/`}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
