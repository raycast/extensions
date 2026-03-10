import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  Detail,
  showToast,
  Toast,
  useNavigation,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise, useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import {
  searchPlaces,
  getDepartures,
  formatWaitTime,
  formatTime,
  getModeIcon,
  getModeName,
  MODE_ORDER,
  type Place,
  type Departure,
} from "./utils/api";

// ─── Favorites ────────────────────────────────────────────────────────────────

export interface FavoriteStation {
  id: string;
  name: string;
  region?: string;
  filter?: string;
}

export function favoriteKey(fav: FavoriteStation): string {
  return `${fav.id}::${fav.filter ?? "all"}`;
}

export function favoriteLabel(fav: FavoriteStation): string {
  if (!fav.filter || fav.filter === "all") return fav.name;
  if (fav.filter.includes("::dir:")) {
    const dir = fav.filter.split("::dir:")[1];
    return `${fav.name} → ${dir}`;
  }
  if (fav.filter.startsWith("mode:")) return `${fav.name} (${fav.filter.slice(5)})`;
  return fav.name;
}

// ─── Departures View ─────────────────────────────────────────────────────────

interface DeparturesViewProps {
  stopArea: { id: string; name: string };
  initialFilter?: string;
  favorites: FavoriteStation[];
  setFavorites: (value: FavoriteStation[]) => void;
}

export function DeparturesView({ stopArea, initialFilter, favorites, setFavorites }: DeparturesViewProps) {
  const { isLoading, data, revalidate, error } = usePromise(getDepartures, [stopArea.id], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: err.message,
      });
    },
  });

  const [selectedFilter, setSelectedFilter] = useState(initialFilter ?? "all");

  const currentFav: FavoriteStation = {
    id: stopArea.id,
    name: stopArea.name,
    filter: selectedFilter,
  };
  const currentKey = favoriteKey(currentFav);
  const isCurrentFavorite = favorites.some((f) => favoriteKey(f) === currentKey);

  function toggleCurrentFavorite() {
    if (isCurrentFavorite) {
      setFavorites(favorites.filter((f) => favoriteKey(f) !== currentKey));
      showToast({
        style: Toast.Style.Success,
        title: "Removed from Favorites",
      });
    } else {
      setFavorites([...favorites, currentFav]);
      showToast({ style: Toast.Style.Success, title: "Added to Favorites" });
    }
  }

  const modeDirections = buildModeDirections(data ?? []);
  const filteredDepartures = filterDepartures(data ?? [], selectedFilter);

  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}\n\n---\n\nGet your free API key at [prim.iledefrance-mobilites.fr](https://prim.iledefrance-mobilites.fr)`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action.OpenInBrowser title="Get Free Api Key" url="https://prim.iledefrance-mobilites.fr" />
            <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const grouped = groupByLine(filteredDepartures);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={stopArea.name}
      isShowingDetail
      searchBarAccessory={
        modeDirections.length > 0 ? (
          <List.Dropdown tooltip="Filter" value={selectedFilter} onChange={setSelectedFilter}>
            <List.Dropdown.Item title="Show All" value="all" icon={Icon.Train} />
            {modeDirections.map(({ mode, directions }) => (
              <List.Dropdown.Section key={mode} title={mode}>
                {modeDirections.length > 1 && (
                  <List.Dropdown.Item title={`All ${mode}`} value={`mode:${mode}`} icon={getModeIcon(mode)} />
                )}
                {directions.map((dir) => (
                  <List.Dropdown.Item
                    key={`${mode}::${dir}`}
                    title={dir}
                    value={`${mode}::dir:${dir}`}
                    icon={Icon.ArrowRight}
                  />
                ))}
              </List.Dropdown.Section>
            ))}
          </List.Dropdown>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title={isCurrentFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={isCurrentFavorite ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={toggleCurrentFavorite}
          />
        </ActionPanel>
      }
    >
      {grouped.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Train}
          title="No Departures Found"
          description={
            selectedFilter !== "all"
              ? "No departures for this filter"
              : "No departures scheduled in the next few minutes"
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action
                title={isCurrentFavorite ? "Remove from Favorites" : "Add to Favorites"}
                icon={isCurrentFavorite ? Icon.StarDisabled : Icon.Star}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
                onAction={toggleCurrentFavorite}
              />
            </ActionPanel>
          }
        />
      ) : (
        grouped.map(({ line, departures }) => (
          <List.Section
            key={line.id}
            title={line.code === line.name ? line.code : `${line.code} — ${line.name}`}
            subtitle={`${departures.length} upcoming`}
          >
            {departures.map((dep, i) => {
              const wait = formatWaitTime(dep.stop_date_time.departure_date_time);
              const time = formatTime(dep.stop_date_time.departure_date_time);
              const isRealtime = dep.stop_date_time.data_freshness === "realtime";

              return (
                <List.Item
                  key={`${dep.route.id}-${i}`}
                  icon={{
                    source: getModeIcon(line.commercial_mode?.name ?? ""),
                    tintColor: line.color
                      ? {
                          light: `#${line.color}`,
                          dark: `#${line.color}`,
                          adjustContrast: true,
                        }
                      : Color.Blue,
                  }}
                  title={dep.display_informations.direction || dep.display_informations.headsign}
                  subtitle={dep.stop_point.name}
                  accessories={[
                    {
                      tag: {
                        value: wait,
                        color: waitColor(wait),
                      },
                    },
                    {
                      text: time,
                      icon: isRealtime ? { source: Icon.Circle, tintColor: Color.Green } : Icon.Clock,
                      tooltip: isRealtime ? "Real time" : "Scheduled",
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={buildDepartureMarkdown(dep)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Direction"
                            text={dep.display_informations.direction}
                            icon={Icon.ArrowRight}
                          />
                          <List.Item.Detail.Metadata.Label title="Departing In" text={wait} icon={Icon.Clock} />
                          <List.Item.Detail.Metadata.Label title="Departure Time" text={time} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Line"
                            text={dep.display_informations.code}
                            icon={getModeIcon(dep.display_informations.commercial_mode)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Mode"
                            text={dep.display_informations.commercial_mode}
                          />
                          <List.Item.Detail.Metadata.Label title="Network" text={dep.display_informations.network} />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label title="Stop" text={dep.stop_point.name} icon={Icon.Pin} />
                          <List.Item.Detail.Metadata.Label
                            title="Data"
                            text={isRealtime ? "Real time" : "Scheduled"}
                            icon={
                              isRealtime
                                ? {
                                    source: Icon.CircleFilled,
                                    tintColor: Color.Green,
                                  }
                                : Icon.Clock
                            }
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        onAction={revalidate}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                      />
                      <Action
                        title={isCurrentFavorite ? "Remove from Favorites" : "Add to Favorites"}
                        icon={isCurrentFavorite ? Icon.StarDisabled : Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={toggleCurrentFavorite}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))
      )}
    </List>
  );
}

// ─── Station Search ───────────────────────────────────────────────────────────

export default function SearchStation() {
  const [query, setQuery] = useState("");
  const { push } = useNavigation();

  const {
    value: favorites,
    setValue: setFavorites,
    isLoading: favoritesLoading,
  } = useLocalStorage<FavoriteStation[]>("favorite-stations", []);
  const favs = favorites ?? [];

  const { isLoading, data, error } = usePromise(searchPlaces, [query], {
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Search Error",
        message: err.message,
      });
    },
  });

  function handleSelect(place: Place) {
    if (!place.stop_area) return;
    push(
      <DeparturesView
        stopArea={{ id: place.stop_area.id, name: place.name }}
        favorites={favs}
        setFavorites={setFavorites}
      />,
    );
  }

  function toggleFavorite(station: FavoriteStation) {
    const key = favoriteKey(station);
    const exists = favs.some((f) => favoriteKey(f) === key);
    if (exists) {
      setFavorites(favs.filter((f) => favoriteKey(f) !== key));
      showToast({
        style: Toast.Style.Success,
        title: "Removed from Favorites",
      });
    } else {
      setFavorites([...favs, station]);
      showToast({ style: Toast.Style.Success, title: "Added to Favorites" });
    }
  }

  function isStationFavorite(id: string) {
    return favs.some((f) => f.id === id && (!f.filter || f.filter === "all"));
  }

  return (
    <List
      isLoading={isLoading || favoritesLoading}
      searchBarPlaceholder="Search for a station (e.g. Chatelet, Nation, Gare du Nord...)"
      onSearchTextChange={setQuery}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error"
          description={`${error.message}\n\nGet your free API key at: https://prim.iledefrance-mobilites.fr`}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Free Api Key" url="https://prim.iledefrance-mobilites.fr" />
              <Action title="Configure Api Key" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : !query || query.length < 2 ? (
        favs.length > 0 ? (
          <List.Section title="Favorites" subtitle={`${favs.length} station${favs.length > 1 ? "s" : ""}`}>
            {favs.map((fav) => (
              <List.Item
                key={favoriteKey(fav)}
                icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                title={favoriteLabel(fav)}
                subtitle={fav.region}
                accessories={[{ icon: Icon.ChevronRight }]}
                actions={
                  <ActionPanel>
                    <Action
                      title="View Upcoming Departures"
                      icon={Icon.Train}
                      onAction={() =>
                        push(
                          <DeparturesView
                            stopArea={{ id: fav.id, name: fav.name }}
                            initialFilter={fav.filter}
                            favorites={favs}
                            setFavorites={setFavorites}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Remove from Favorites"
                      icon={Icon.StarDisabled}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => toggleFavorite(fav)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.Train}
            title="Search for a Station"
            description="Type at least 2 characters to search"
          />
        )
      ) : (
        <List.Section
          title={`Results for "${query}"`}
          subtitle={data ? `${data.length} station${data.length > 1 ? "s" : ""}` : ""}
        >
          {(data ?? [])
            .filter((p) => p.embedded_type === "stop_area" && p.stop_area)
            .map((place) => {
              const region = place.stop_area?.administrative_regions?.find((r) => r.level === 8)?.name;
              const isFav = isStationFavorite(place.stop_area!.id);
              return (
                <List.Item
                  key={place.id}
                  icon={isFav ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Train}
                  title={place.name}
                  subtitle={region}
                  accessories={[{ icon: Icon.ChevronRight }]}
                  actions={
                    <ActionPanel>
                      <Action title="View Upcoming Departures" icon={Icon.Train} onAction={() => handleSelect(place)} />
                      <Action
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        icon={isFav ? Icon.StarDisabled : Icon.Star}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() =>
                          toggleFavorite({
                            id: place.stop_area!.id,
                            name: place.name,
                            region,
                          })
                        }
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildModeDirections(departures: Departure[]) {
  const map = new Map<string, Set<string>>();
  for (const d of departures) {
    const mode = d.display_informations.commercial_mode;
    const dir = d.display_informations.direction;
    if (!mode) continue;
    if (!map.has(mode)) map.set(mode, new Set());
    if (dir) map.get(mode)!.add(dir);
  }
  return Array.from(map.entries())
    .map(([mode, dirs]) => ({
      mode,
      directions: [...dirs].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const ia = MODE_ORDER.findIndex((m) => a.mode.includes(m));
      const ib = MODE_ORDER.findIndex((m) => b.mode.includes(m));
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
}

function filterDepartures(departures: Departure[], filter: string): Departure[] {
  if (filter === "all") return departures;
  if (filter.startsWith("mode:")) {
    const mode = filter.slice(5);
    return departures.filter((d) => d.display_informations.commercial_mode === mode);
  }
  if (filter.includes("::dir:")) {
    const [mode, dirPart] = filter.split("::dir:");
    const dir = dirPart;
    return departures.filter(
      (d) => d.display_informations.commercial_mode === mode && d.display_informations.direction === dir,
    );
  }
  return departures;
}

function groupByLine(departures: Departure[]) {
  const map = new Map<string, { line: Departure["route"]["line"]; departures: Departure[] }>();

  for (const dep of departures) {
    const key = dep.route.line.id;
    if (!map.has(key)) {
      map.set(key, { line: dep.route.line, departures: [] });
    }
    map.get(key)!.departures.push(dep);
  }

  return Array.from(map.values()).sort((a, b) => {
    const modeA = MODE_ORDER.findIndex((m) => a.line.commercial_mode?.name?.includes(m));
    const modeB = MODE_ORDER.findIndex((m) => b.line.commercial_mode?.name?.includes(m));
    if (modeA !== modeB) return modeA - modeB;
    return a.line.code.localeCompare(b.line.code, "en", { numeric: true });
  });
}

function waitColor(wait: string): Color {
  if (wait === "Departed") return Color.SecondaryText;
  if (wait === "Approaching") return Color.Red;
  const min = parseInt(wait);
  if (isNaN(min)) return Color.SecondaryText;
  if (min <= 2) return Color.Red;
  if (min <= 5) return Color.Orange;
  if (min <= 10) return Color.Yellow;
  return Color.Green;
}

function buildDepartureMarkdown(dep: Departure): string {
  const modeName = getModeName(dep.display_informations.commercial_mode);
  const time = formatTime(dep.stop_date_time.departure_date_time);
  const wait = formatWaitTime(dep.stop_date_time.departure_date_time);
  const isRealtime = dep.stop_date_time.data_freshness === "realtime";

  return [
    `## ${modeName} — Line ${dep.display_informations.code}`,
    "",
    `**Direction:** ${dep.display_informations.direction}`,
    "",
    `**Departure:** ${time} *(${wait})*`,
    "",
    isRealtime ? "**Real-time data**" : "*Scheduled time*",
    dep.display_informations.description ? `\n> ${dep.display_informations.description}` : "",
  ]
    .join("\n")
    .trim();
}
