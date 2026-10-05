import { useMemo, useState } from "react";

import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";

import airports from "./airports.json";

type Airport = {
  icao: string | null;
  iata: string | null;
  name: string;
  city: string | null;
  country: string | null;
  region: string | null;
  continent: string | null;
  type: string;
  scheduled: boolean;
  elevationFt: number | null;
  lat: number | null;
  lon: number | null;
  wiki: string | null;
  home: string | null;
};

const AIRPORTS = airports as Airport[];

const TYPE_LABEL: Record<string, string> = {
  large_airport: "Large airport",
  medium_airport: "Medium airport",
  small_airport: "Small airport",
  heliport: "Heliport",
  seaplane_base: "Seaplane base",
  balloonport: "Balloonport",
};

const CONTINENT_LABEL: Record<string, string> = {
  AF: "Africa",
  AN: "Antarctica",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  OC: "Oceania",
  SA: "South America",
};

function score(airport: Airport, needle: string): number {
  const icao = airport.icao?.toUpperCase() ?? "";
  const iata = airport.iata?.toUpperCase() ?? "";
  const name = airport.name.toUpperCase();
  const city = airport.city?.toUpperCase() ?? "";

  if (icao === needle || iata === needle) return 0;
  if (icao.startsWith(needle) || iata.startsWith(needle)) return 1;
  if (name.startsWith(needle) || city.startsWith(needle)) return 2;
  if (name.includes(needle) || city.includes(needle)) return 3;
  return -1;
}

function filterAirports(query: string): Airport[] {
  const needle = query.trim().toUpperCase();
  if (!needle) {
    // No query yet: surface a handful of big, familiar hubs.
    return AIRPORTS.filter((a) => a.type === "large_airport" && a.scheduled)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);
  }

  const scored = AIRPORTS.map((a) => ({ a, s: score(a, needle) })).filter((x) => x.s >= 0);
  scored.sort((x, y) => x.s - y.s || x.a.name.localeCompare(y.a.name));
  return scored.slice(0, 50).map((x) => x.a);
}

function formatElevation(ft: number | null): string {
  if (ft === null) return "Unknown";
  const m = Math.round(ft * 0.3048);
  return `${ft.toLocaleString()} ft (${m.toLocaleString()} m)`;
}

function formatCoords(lat: number | null, lon: number | null): string {
  if (lat === null || lon === null) return "Unknown";
  const latStr = `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? "E" : "W"}`;
  return `${latStr}, ${lonStr}`;
}

function mapsUrl(airport: Airport): string | null {
  if (airport.lat === null || airport.lon === null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${airport.lat},${airport.lon}`;
}

function flightradarUrl(airport: Airport): string | null {
  const code = airport.iata ?? airport.icao;
  if (!code) return null;
  return `https://www.flightradar24.com/airport/${code.toLowerCase()}`;
}

function AirportDetail({ airport }: { airport: Airport }) {
  const continent = airport.continent ? (CONTINENT_LABEL[airport.continent] ?? airport.continent) : "Unknown";
  const type = TYPE_LABEL[airport.type] ?? airport.type;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={airport.name} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ICAO" text={airport.icao ?? "—"} />
          <List.Item.Detail.Metadata.Label title="IATA" text={airport.iata ?? "—"} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Location"
            text={[airport.city, airport.region, airport.country].filter(Boolean).join(", ") || "Unknown"}
          />
          <List.Item.Detail.Metadata.Label title="Continent" text={continent} />
          <List.Item.Detail.Metadata.Label title="Coordinates" text={formatCoords(airport.lat, airport.lon)} />
          <List.Item.Detail.Metadata.Label title="Elevation" text={formatElevation(airport.elevationFt)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Type" text={type} />
          <List.Item.Detail.Metadata.Label
            title="Scheduled service"
            text={airport.scheduled ? "Yes" : "No / unknown"}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command(props: LaunchProps) {
  const [query, setQuery] = useState(props.fallbackText ?? "");
  const results = useMemo(() => filterAirports(query), [query]);

  return (
    <List
      isShowingDetail
      searchBarPlaceholder="Search by ICAO, IATA, name, or city (e.g. KJFK, LHR, Tokyo)"
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
    >
      {results.map((airport) => {
        const codeLabel = [airport.icao, airport.iata].filter(Boolean).join(" / ") || "—";
        const maps = mapsUrl(airport);
        const fr24 = flightradarUrl(airport);

        return (
          <List.Item
            key={`${airport.icao ?? ""}-${airport.iata ?? ""}-${airport.name}`}
            icon={Icon.Airplane}
            title={codeLabel}
            subtitle={airport.name}
            detail={<AirportDetail airport={airport} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {airport.icao && <Action.CopyToClipboard title="Copy ICAO Code" content={airport.icao} />}
                  {airport.iata && <Action.CopyToClipboard title="Copy IATA Code" content={airport.iata} />}
                  <Action.CopyToClipboard title="Copy Airport Name" content={airport.name} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {maps && <Action.OpenInBrowser title="Open in Google Maps" url={maps} icon={Icon.Pin} />}
                  {airport.wiki && (
                    <Action.OpenInBrowser title="Open Wikipedia Article" url={airport.wiki} icon={Icon.Globe} />
                  )}
                  {airport.home && (
                    <Action.OpenInBrowser title="Open Airport Website" url={airport.home} icon={Icon.Link} />
                  )}
                  {fr24 && (
                    <Action.OpenInBrowser title="Open on Flightradar24" url={fr24} icon={Icon.AirplaneTakeoff} />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
