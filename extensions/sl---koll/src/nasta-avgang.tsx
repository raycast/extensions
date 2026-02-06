import { Action, ActionPanel, List, Icon, LocalStorage, showToast, Toast, LaunchProps } from "@raycast/api";
import { useState, useEffect } from "react";
import { searchStop, getDepartures, Stop, Departure } from "./api";

// Define a route favorite type
interface FavoriteRoute {
  type: "route";
  id: string; // Composite key: siteId_sourceName_line_dest
  siteId: string;
  stopName: string;
  lineNumber: string;
  destination: string;
  transportCategory: string;
}

// Union type for favorites
type Favorite = Stop | FavoriteRoute;

export default function Command(props: LaunchProps<{ arguments: { query?: string } }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const [stops, setStops] = useState<Stop[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites on mount
  useEffect(() => {
    async function loadFavorites() {
      const stored = await LocalStorage.getItem<string>("favorites");
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    }
    loadFavorites();
  }, []);

  useEffect(() => {
    async function fetchStops() {
      if (searchText.length < 3) {
        setStops([]);
        return;
      }
      setIsLoading(true);
      const results = await searchStop(searchText);
      setStops(results);
      setIsLoading(false);
    }

    const delayDebounceFn = setTimeout(() => {
      fetchStops();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  async function toggleFavorite(item: Favorite) {
    const isFav = favorites.some((f) => f.id === item.id);
    let newFavorites;

    if (isFav) {
      newFavorites = favorites.filter((f) => f.id !== item.id);
      const name =
        "type" in item && item.type === "route" ? `${item.lineNumber} till ${item.destination}` : (item as Stop).name;
      await showToast(Toast.Style.Success, "Borttagen från favoriter", name);
    } else {
      newFavorites = [...favorites, item];
      const name =
        "type" in item && item.type === "route" ? `${item.lineNumber} till ${item.destination}` : (item as Stop).name;
      await showToast(Toast.Style.Success, "Tillagd i favoriter", name);
    }

    setFavorites(newFavorites);
    await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
  }

  function isFavorite(id: string) {
    return favorites.some((f) => f.id === id);
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Sök efter hållplats..."
      throttle
    >
      {searchText === "" ? (
        <List.Section title="Favoriter">
          {favorites.map((fav) => {
            if ("type" in fav && fav.type === "route") {
              return (
                <RouteItem
                  key={fav.id}
                  route={fav}
                  onToggle={() => toggleFavorite(fav)}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                />
              );
            } else {
              // It's a Stop
              const stop = fav as Stop;
              return (
                <StopItem
                  key={stop.id}
                  stop={stop}
                  isFavorite={true}
                  onToggleFavorite={() => toggleFavorite(stop)}
                  favorites={favorites}
                  passDownToggle={toggleFavorite}
                />
              );
            }
          })}
        </List.Section>
      ) : (
        <List.Section title="Sökresultat">
          {stops.map((stop) => (
            <StopItem
              key={stop.id}
              stop={stop}
              isFavorite={isFavorite(stop.id)}
              onToggleFavorite={() => toggleFavorite(stop)}
              favorites={favorites}
              passDownToggle={toggleFavorite}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function StopItem({
  stop,
  isFavorite,
  onToggleFavorite,
  favorites,
  passDownToggle,
}: {
  stop: Stop;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  favorites: Favorite[];
  passDownToggle: (item: Favorite) => void;
}) {
  return (
    <List.Item
      icon={Icon.Pin}
      title={stop.name}
      accessories={[{ icon: isFavorite ? Icon.Star : undefined }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Visa Avgångar"
            target={
              <DeparturesView
                stopName={stop.name}
                siteId={stop.id}
                favorites={favorites}
                onToggleFavorite={passDownToggle}
              />
            }
          />
          <Action
            title={isFavorite ? "Ta Bort Favorit" : "Spara Som Favorit"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={onToggleFavorite}
          />
        </ActionPanel>
      }
    />
  );
}

function RouteItem({
  route,
  onToggle,
  favorites,
  onToggleFavorite,
}: {
  route: FavoriteRoute;
  onToggle: () => void;
  favorites: Favorite[];
  onToggleFavorite: (item: Favorite) => void;
}) {
  return (
    <List.Item
      icon={getTransportIcon(route.transportCategory)}
      title={`${route.lineNumber} mot ${route.destination}`}
      subtitle={`Från ${route.stopName}`}
      accessories={[{ icon: Icon.Star }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Visa Avgångar"
            target={
              <DeparturesView
                stopName={route.stopName}
                siteId={route.siteId}
                filter={{ lineNumber: route.lineNumber, destination: route.destination }}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
              />
            }
          />
          <Action title="Ta Bort Favorit" icon={Icon.StarDisabled} onAction={onToggle} />
        </ActionPanel>
      }
    />
  );
}

function DeparturesView({
  stopName,
  siteId,
  filter,
  favorites,
  onToggleFavorite,
}: {
  stopName: string;
  siteId: string;
  filter?: { lineNumber: string; destination: string };
  favorites: Favorite[];
  onToggleFavorite: (item: Favorite) => void;
}) {
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDepartures() {
      setIsLoading(true);
      const data = await getDepartures(siteId);
      setDepartures(data);
      setIsLoading(false);
    }
    fetchDepartures();
  }, [siteId]);

  const filteredDepartures = filter
    ? departures.filter((d) => d.lineNumber === filter.lineNumber && d.destination === filter.destination)
    : departures;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        filter ? `Avgångar: ${filter.lineNumber} mot ${filter.destination}` : `Avgångar från ${stopName}`
      }
      searchBarPlaceholder="Filtrera avgångar..."
    >
      {filteredDepartures.map((dep, index) => {
        // checks if this specific departure is favored
        const routeId = `${siteId}_${dep.lineNumber}_${dep.destination}`;
        const isRouteFav = favorites.some((f) => f.id === routeId);

        return (
          <List.Item
            key={`${dep.lineNumber}-${dep.destination}-${index}`}
            icon={getTransportIcon(dep.transportCategory)}
            title={`${dep.lineNumber} mot ${dep.destination}`}
            subtitle={dep.displayTime}
            accessories={[{ text: dep.transportMode }, { icon: isRouteFav ? Icon.Star : undefined }]}
            actions={
              <ActionPanel>
                <Action
                  title={isRouteFav ? "Ta Bort Avgång Från Favoriter" : "Spara Avgång Som Favorit"}
                  icon={isRouteFav ? Icon.StarDisabled : Icon.Star}
                  onAction={() => {
                    const newRouteFav: FavoriteRoute = {
                      type: "route",
                      id: routeId,
                      siteId: siteId,
                      stopName: stopName,
                      lineNumber: dep.lineNumber,
                      destination: dep.destination,
                      transportCategory: dep.transportCategory,
                    };
                    onToggleFavorite(newRouteFav);
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function getTransportIcon(category: string) {
  // ResRobot codes:
  // B: Bus
  // S: Tram
  // M: Metro
  // J: Train
  // F: Ship
  switch (category?.toUpperCase()) {
    case "M":
      return Icon.Train;
    case "B":
      return Icon.Car; // Bus
    case "J":
      return Icon.Train;
    case "S":
      return Icon.Train;
    case "F":
      return Icon.Boat;
    default:
      return Icon.Circle;
  }
}
