import { Action, ActionPanel, Color, Icon, List, LocalStorage } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@raycast/utils";
import type {
  NearbyDeparturesFromCoordsV2Response,
  SearchResultResponse,
  NearbyDepartureV2,
  NearbyDirectionV2,
  Trip,
  Stop,
  SearchResultStop,
} from "./birchtypes";

const BIRCH = "https://birch.catenarymaps.org";
const CF_GEO_URL = "https://cf-object.quacksire.workers.dev/";
const DEFAULT_RADIUS_METERS = 3500;
const DEPARTURE_CUTOFF_SECS = 150 * 60;

const RECENT_STOPS_KEY = "recent_stops";
const MAX_RECENT_STOPS = 5;

type LocationChoice = {
  type: "stop" | "detected";
  name: string;
  lat: number;
  lon: number;
  stopData?: SearchResultStop;
};

type CfGeoResponse = {
  latitude?: string | number;
  longitude?: string | number;
  city?: string;
  region?: string;
};

type TripEntry = {
  dep: NearbyDepartureV2;
  dir: NearbyDirectionV2;
  t: Trip;
  when: number;
  directionId: string;
};

type ChildGroup = {
  stopId: string;
  baseName: string;
  displayName: string;
  lat: number;
  lon: number;
  trips: TripEntry[];
  minDistance: number;
  stopInfo: Stop;
};

type ParentGroup = {
  baseName: string;
  children: ChildGroup[];
  minDistance: number;
};

/* -------------------------------------------------------------------------- */
/* Root Command                                                               */
/* -------------------------------------------------------------------------- */

export default function Command() {
  // Root just renders the first view: LocationPicker
  return <LocationPicker />;
}

/* -------------------------------------------------------------------------- */
/* Location Picker (auto-detect + Birch search)                               */
/* -------------------------------------------------------------------------- */

function LocationPicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationChoice[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [detected, setDetected] = useState<LocationChoice | null>(null);
  const [recents, setRecents] = useState<LocationChoice[]>([]);

  // Load recents
  useEffect(() => {
    (async () => {
      try {
        const json = await LocalStorage.getItem<string>(RECENT_STOPS_KEY);
        if (json) {
          setRecents(JSON.parse(json));
        }
      } catch (e) {
        console.error("Failed to load recents", e);
      }
    })();
  }, []);

  // Auto-detect location via Cloudflare Worker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(CF_GEO_URL);
        const cf = (await res.json()) as CfGeoResponse;
        const lat = parseFloat(String(cf.latitude));
        const lon = parseFloat(String(cf.longitude));
        if (!cancelled && !Number.isNaN(lat) && !Number.isNaN(lon) && cf.city && cf.region) {
          setDetected({
            type: "detected",
            name: `${cf.city}, ${cf.region}`,
            lat,
            lon,
          });
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Birch text search (stops_section)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    (async () => {
      try {
        const res = await fetch(`${BIRCH}/text_search_v1?text=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as SearchResultResponse;
        const ranking = json.stops_section.ranking;
        const stops = json.stops_section.stops;

        const mapped: LocationChoice[] = ranking
          .map((r) => {
            const found = Object.values(stops)
              .flatMap((s) => Object.values(s))
              .find((ss) => ss.gtfs_id === r.gtfs_id);
            return found
              ? {
                  type: "stop",
                  name: found.name,
                  lat: found.point.y,
                  lon: found.point.x,
                  stopData: found,
                }
              : null;
          })
          .filter(Boolean) as LocationChoice[];

        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    })();

    return () => controller.abort();
  }, [query]);

  return (
    <List
      searchBarPlaceholder="Search a stop, station, or place"
      onSearchTextChange={setQuery}
      isLoading={isSearching}
      throttle
    >
      {!query && recents.length > 0 && (
        <List.Section title="Recent Stops">
          {recents.map((loc, i) => (
            <List.Item
              key={`recent-${i}-${loc.name}`}
              icon={Icon.Clock}
              title={loc.name}
              subtitle={`${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Nearby Stops"
                    icon={Icon.Forward}
                    target={<NearbyStopsView location={loc} />}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {detected && (
        <List.Section title="Detected Location">
          <List.Item
            icon={Icon.Map}
            title={detected.name}
            subtitle={`${detected.lat.toFixed(3)}, ${detected.lon.toFixed(3)}`}
            accessories={[
              {
                tag: { value: "Auto", color: Color.Green },
                tooltip: "Your approximate location inferred from your IP address. ",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Nearby Stops"
                  icon={Icon.Forward}
                  target={<NearbyStopsView location={detected} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Search Results">
        {results.map((loc) => (
          <List.Item
            key={`${loc.name}-${loc.lat}-${loc.lon}`}
            icon={Icon.Pin}
            title={loc.name}
            subtitle={`${loc.lat.toFixed(3)}, ${loc.lon.toFixed(3)}`}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Nearby Stops"
                  icon={Icon.Forward}
                  target={<NearbyStopsView location={loc} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {!isSearching && results.length === 0 && query && (
        <List.EmptyView title="No locations found" description="Try another search term." />
      )}
    </List>
  );
}

/* -------------------------------------------------------------------------- */
/* Nearby Stops View (grouped by stop, closest first)                         */
/* -------------------------------------------------------------------------- */

function NearbyStopsView({ location }: { location: LocationChoice }) {
  const [filterType, setFilterType] = useState<"all" | "bus" | "rail" | "metro" | "other">("all");

  // Save to recents on mount
  useEffect(() => {
    if (location.type !== "stop") return;

    (async () => {
      try {
        const json = await LocalStorage.getItem<string>(RECENT_STOPS_KEY);
        let list: LocationChoice[] = json ? JSON.parse(json) : [];

        // Remove existing if present (to move to top)
        list = list.filter((l) => l.name !== location.name || Math.abs(l.lat - location.lat) > 0.0001);

        // Add to top
        list.unshift(location);

        // Limit
        if (list.length > MAX_RECENT_STOPS) {
          list = list.slice(0, MAX_RECENT_STOPS);
        }

        await LocalStorage.setItem(RECENT_STOPS_KEY, JSON.stringify(list));
      } catch (e) {
        console.error("Failed to save recent stop", e);
      }
    })();
  }, [location]);

  const { isLoading, data, revalidate } = useFetch<NearbyDeparturesFromCoordsV2Response>(
    `${BIRCH}/nearbydeparturesfromcoordsv2?lat=${location.lat}&lon=${location.lon}&radius=${DEFAULT_RADIUS_METERS}`,
    {
      parseResponse: async (res) => res.json() as Promise<NearbyDeparturesFromCoordsV2Response>,
    },
  );

  const parents: ParentGroup[] = useMemo(() => {
    if (!data) return [];
    const now = Math.floor(Date.now() / 1000);
    return buildStopGroups(data, now);
  }, [data]);

  const now = Math.floor(Date.now() / 1000);

  const filteredParents = useMemo(() => {
    if (filterType === "all") return parents;

    return parents
      .map((p) => ({
        ...p,
        children: p.children
          .map((c) => ({
            ...c,
            trips: c.trips.filter((t) => {
              // Filter out circular trips (headsign matches selected location)
              if (t.dir.headsign === location.name) return false;

              const rt = t.dep.route_type;
              if (filterType === "bus") return rt === 3 || rt === 11 || (rt >= 700 && rt < 800);
              if (filterType === "rail") return rt === 2 || (rt >= 100 && rt < 200);
              if (filterType === "metro") return rt === 1 || (rt >= 400 && rt < 500);
              if (filterType === "other") {
                // Exclude bus, rail, metro
                const isBus = rt === 3 || rt === 11 || (rt >= 700 && rt < 800);
                const isRail = rt === 2 || (rt >= 100 && rt < 200);
                const isMetro = rt === 1 || (rt >= 400 && rt < 500);
                return !isBus && !isRail && !isMetro;
              }
              return true;
            }),
          }))
          .filter((c) => c.trips.length > 0),
      }))
      .filter((p) => p.children.length > 0);
  }, [parents, filterType]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search departures around ${location.name}`}
      navigationTitle={`Departures near ${location.name}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Mode"
          storeValue={true}
          onChange={(newValue) => setFilterType(newValue as "all" | "bus" | "rail" | "metro" | "other")}
        >
          <List.Dropdown.Item title="All Modes" value="all" />
          <List.Dropdown.Item title="Bus" value="bus" />
          <List.Dropdown.Item title="Rail" value="rail" />
          <List.Dropdown.Item title="Metro" value="metro" />
          <List.Dropdown.Item title="Other" value="other" />
        </List.Dropdown>
      }
    >
      {filteredParents.length > 0
        ? filteredParents.map((parent) => {
            // Flatten all trips from all children (bays)
            const allTrips = parent.children.flatMap((c) =>
              c.trips.map((t) => ({ ...t, stopName: c.displayName, stopId: c.stopId, stopLat: c.lat, stopLon: c.lon })),
            );

            // Group trips by route and directionId
            const groups = groupTrips(allTrips);
            if (groups.length === 0) return null;

            return (
              <List.Section key={parent.baseName} title={parent.baseName} subtitle={formatDistance(parent.minDistance)}>
                {groups.map((group) => {
                  const first = group.trips[0];
                  const { dep, dir } = first;

                  // Calculate times
                  const times = group.trips
                    .map((trip) => {
                      if (trip.t.cancelled) return "Cancelled";

                      const baseTs = trip.t.departure_realtime ?? trip.t.departure_schedule;
                      if (!baseTs) return "";
                      const mins = Math.max(0, Math.floor((baseTs - now) / 60));

                      // Include trip short name if available
                      const shortName = trip.t.trip_short_name ? ` #${trip.t.trip_short_name}` : "";
                      return `${mins} min${shortName}`;
                    })
                    .slice(0, 3); // Show next 3

                  const timeString = times.join(", ");

                  // Title is Headsign
                  const title = dir.headsign;

                  // Subtitle is Route Name + Bay info if applicable
                  const routeName = dep.short_name || dep.long_name || "Route";

                  // Determine bay info
                  // If all trips in this group are from the same stop/bay, show it in subtitle if it differs from parent
                  // If mixed, maybe don't show or show "Mixed"?
                  // Actually, usually a route+direction is at a single bay.
                  // Let's check unique stop names in this group
                  const uniqueStops = Array.from(new Set(group.trips.map((t) => t.stopName)));
                  let bayInfo = "";
                  if (uniqueStops.length === 1) {
                    const stopName = uniqueStops[0];
                    if (stopName !== parent.baseName) {
                      // Extract bay part: "San Jose Diridon (Bay 12)" -> "Bay 12"
                      // Or just replace parent name
                      const remainder = stopName.replace(parent.baseName, "").trim();
                      // Clean up parens if they wrap the whole remainder
                      const cleanRemainder = remainder.replace(/^\((.*)\)$/, "$1");
                      if (cleanRemainder) {
                        bayInfo = ` • ${cleanRemainder}`;
                      }
                    }
                  } else {
                    // Multiple bays for same route/dir? Rare but possible.
                    bayInfo = " • Multiple Bays";
                  }

                  const catenaryUrl = buildCatenaryUrl({
                    stopLat: first.stopLat,
                    stopLon: first.stopLon,
                    trip: first.t,
                    dep,
                  });

                  const routeIcon = dep.route_type === 3 ? Icon.Car : dep.route_type === 4 ? Icon.Boat : Icon.Train;

                  return (
                    <List.Item
                      key={`${parent.baseName}-${dep.route_id}-${first.directionId}`}
                      icon={{
                        source: routeIcon,
                        tintColor: dep.color ? { light: dep.color, dark: dep.color } : undefined,
                      }}
                      title={title}
                      subtitle={`${routeName}${bayInfo}`}
                      accessories={[{ text: { value: timeString, color: Color.PrimaryText } }]}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser title="Open in Catenary" icon={Icon.Globe} url={catenaryUrl} />
                          <Action.OpenInBrowser
                            title="Open Stop in Maps"
                            icon={Icon.Map}
                            url={`https://maps.apple.com/?sll=${first.stopLat},${first.stopLon}&q=${encodeURIComponent(first.stopName + " " + (dep.route_type === 3 ? "Stop" : dep.route_type === 4 ? "" : "Station"))}&ll=${first.stopLat},${first.stopLon}&dirflg=r&t=r`}
                          />
                          <Action title="Refresh" icon={Icon.Repeat} onAction={() => revalidate()} />
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            );
          })
        : !isLoading && <List.EmptyView title="No nearby departures" description="Try another location or radius." />}
    </List>
  );
}

type FlatTripEntry = TripEntry & { stopName: string; stopId: string; stopLat: number; stopLon: number };

function groupTrips(trips: FlatTripEntry[]) {
  const groups: Record<string, { trips: FlatTripEntry[] }> = {};
  for (const trip of trips) {
    // Group by route_id and directionId
    const key = `${trip.dep.route_id}_${trip.directionId}`;
    if (!groups[key]) {
      groups[key] = { trips: [] };
    }
    groups[key].trips.push(trip);
  }
  return Object.values(groups).sort((a, b) => a.trips[0].when - b.trips[0].when);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeStopName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function formatDistance(m: number | undefined | null): string {
  if (m == null || Number.isNaN(m)) return "";
  if (m < 1000) return `${m.toFixed(0)} m`;
  const km = m / 1000;
  if (km < 3) return `${km.toFixed(2)} km`;
  const mi = km * 0.621371;
  return `${mi.toFixed(1)} mi`;
}

function buildStopGroups(data: NearbyDeparturesFromCoordsV2Response, now: number): ParentGroup[] {
  const allStops: Stop[] = Object.values(data.stop).flatMap((feed) => Object.values(feed));

  const childMap: Record<string, ChildGroup> = {};

  for (const dep of data.departures) {
    // v2: directions is Record<string, Record<string, NearbyDirectionV2>>
    // Outer key is directionId (e.g. "0", "1")
    for (const [directionId, dirGroup] of Object.entries(dep.directions)) {
      for (const dir of Object.values(dirGroup)) {
        for (const t of dir.trips) {
          const stopId = t.stop_id;
          const stopInfo =
            allStops.find((s) => s.gtfs_id === stopId) ??
            ({
              gtfs_id: stopId,
              name: stopId,
              lat: 0,
              lon: 0,
            } as unknown as Stop);

          if (!childMap[stopId]) {
            childMap[stopId] = {
              stopId,
              baseName: normalizeStopName(stopInfo.name),
              displayName: stopInfo.name,
              lat: stopInfo.lat,
              lon: stopInfo.lon,
              trips: [],
              minDistance: dep.closest_distance,
              stopInfo,
            };
          }

          const when = t.departure_realtime ?? t.departure_schedule ?? 0;
          // Include cancelled trips in the list, but we might want to sort them or handle them
          // The user said "remove deleted trips", which might mean "don't show past trips".
          // We already filter by `when > now` later.
          // But for cancelled trips, `when` might still be valid (scheduled time).
          childMap[stopId].trips.push({ dep, dir, t, when, directionId });
          childMap[stopId].minDistance = Math.min(childMap[stopId].minDistance, dep.closest_distance);
        }
      }
    }
  }

  const parentMap: Record<string, ParentGroup> = {};

  for (const child of Object.values(childMap)) {
    const key = child.baseName || child.displayName;
    if (!parentMap[key]) {
      parentMap[key] = {
        baseName: key,
        children: [],
        minDistance: child.minDistance,
      };
    }
    parentMap[key].children.push(child);
    parentMap[key].minDistance = Math.min(parentMap[key].minDistance, child.minDistance);
  }

  const parents: ParentGroup[] = Object.values(parentMap)
    .map((p) => ({
      ...p,
      children: p.children
        .map((c) => ({
          ...c,
          trips: c.trips
            .filter(
              (x) =>
                // Keep cancelled trips so we can show them as "Cancelled"
                // But still filter out past trips
                x.when > now &&
                x.when - now <= DEPARTURE_CUTOFF_SECS &&
                !!(x.t.departure_realtime ?? x.t.departure_schedule),
            )
            .sort((a, b) => a.when - b.when),
        }))
        .filter((c) => c.trips.length > 0)
        .sort((a, b) => a.displayName.localeCompare(b.displayName)),
    }))
    .filter((p) => p.children.length > 0)
    .sort((a, b) => a.minDistance - b.minDistance);

  return parents;
}

function buildCatenaryUrl({
  stopLat,
  stopLon,
  dep,
}: {
  stopLat: number;
  stopLon: number;
  trip: Trip;
  dep: NearbyDepartureV2;
}): string {
  return `https://maps.catenarymaps.org/?screen=route&chateau=${dep.chateau_id}&route_id=${dep.route_id}&pos=13/${stopLat}/${stopLon}`;
}
