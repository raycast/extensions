import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatDate,
  formatTime,
  getSbbUrl,
  searchConnections,
  searchLocations,
} from "./api/transport";
import type { Connection, FavoriteRoute, Station } from "./types";

type View = "search" | "results";

const FAVORITES_KEY = "favorite-routes";
const timeFormatter = new Intl.DateTimeFormat("de-CH", { timeStyle: "short" });

function formatConnectionTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return timeFormatter.format(new Date(value));
}

function isValidStation(station: Station): boolean {
  return station.id.trim().length > 0 && station.name.trim().length > 0;
}

function stationDropdownItems(
  selected: Station | undefined,
  results: Station[],
): Station[] {
  const validResults = results.filter(isValidStation);
  const validSelected = selected && isValidStation(selected) ? selected : undefined;

  if (!validSelected || validResults.some((station) => station.id === validSelected.id)) {
    return validResults;
  }

  return [validSelected, ...validResults];
}

export default function Command() {
  const [favorites, setFavorites] = useState<FavoriteRoute[]>([]);
  const [view, setView] = useState<View>("search");
  const [fromStation, setFromStation] = useState<Station | undefined>();
  const [toStation, setToStation] = useState<Station | undefined>();
  const [fromResults, setFromResults] = useState<Station[]>([]);
  const [toResults, setToResults] = useState<Station[]>([]);
  const [isSearchingFrom, setIsSearchingFrom] = useState(false);
  const [isSearchingTo, setIsSearchingTo] = useState(false);
  const [departure, setDeparture] = useState(() => new Date());
  const stationsByIdRef = useRef<Map<string, Station>>(new Map());
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [latestPageData, setLatestPageData] = useState<Connection[]>([]);

  const date = formatDate(departure);
  const time = formatTime(departure);

  const resetDepartureNow = useCallback(() => {
    setDeparture(new Date());
  }, []);

  const cacheStations = useCallback((stations: Station[]) => {
    for (const station of stations) {
      if (isValidStation(station)) {
        stationsByIdRef.current.set(station.id, station);
      }
    }
  }, []);

  const resolveStation = useCallback(
    (stationId: string | undefined, results: Station[]): Station | undefined => {
      if (!stationId) {
        return undefined;
      }

      return (
        stationsByIdRef.current.get(stationId) ?? results.find((station) => station.id === stationId)
      );
    },
    [],
  );

  useEffect(() => {
    async function loadFavorites() {
      const stored = await LocalStorage.getItem<string>(FAVORITES_KEY);
      if (!stored) {
        return;
      }

      try {
        setFavorites(JSON.parse(stored) as FavoriteRoute[]);
      } catch {
        setFavorites([]);
      }
    }

    void loadFavorites();
  }, []);

  function addFavorite(from: Station, to: Station) {
    const id = `${from.id}-${to.id}`;
    const label = `${from.name} → ${to.name}`;

    setFavorites((current) => {
      if (current.some((favorite) => favorite.id === id)) {
        return current;
      }

      const next = [...current, { id, label, from, to }];
      void LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }

  const searchFromStations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setFromResults([]);
      return;
    }

    setIsSearchingFrom(true);
    try {
      const results = await searchLocations(query);
      cacheStations(results);
      setFromResults(results);
    } catch {
      setFromResults([]);
    } finally {
      setIsSearchingFrom(false);
    }
  }, [cacheStations]);

  const searchToStations = useCallback(async (query: string) => {
    if (query.length < 2) {
      setToResults([]);
      return;
    }

    setIsSearchingTo(true);
    try {
      const results = await searchLocations(query);
      cacheStations(results);
      setToResults(results);
    } catch {
      setToResults([]);
    } finally {
      setIsSearchingTo(false);
    }
  }, [cacheStations]);

  useEffect(() => {
    if (view !== "results" || !fromStation || !toStation) {
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoadingConnections(true);
      setConnectionError(null);

      try {
        const data = await searchConnections({
          fromId: fromStation!.id,
          toId: toStation!.id,
          date,
          time,
          page,
        });

        if (!cancelled) {
          setLatestPageData(data);
        }
      } catch (error) {
        if (!cancelled) {
          setConnectionError(
            error instanceof Error ? error.message : "Failed to load connections",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConnections(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [view, fromStation, toStation, date, time, page]);

  useEffect(() => {
    if (view !== "results") {
      return;
    }

    setConnections((current) =>
      page === 0 ? latestPageData : [...current, ...latestPageData],
    );
  }, [latestPageData, page, view]);

  function handleFromChange(stationId: string) {
    const station = resolveStation(stationId, fromResults);
    if (station) {
      setFromStation(station);
    }
  }

  function handleToChange(stationId: string) {
    const station = resolveStation(stationId, toResults);
    if (station) {
      setToStation(station);
    }
  }

  function startSearch(values: Form.Values) {
    const from = resolveStation(values.from as string | undefined, fromResults) ?? fromStation;
    const to = resolveStation(values.to as string | undefined, toResults) ?? toStation;

    if (!from || !to) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Select stations",
        message: "Choose both a departure and arrival station.",
      });
      return;
    }

    setFromStation(from);
    setToStation(to);

    setPage(0);
    setConnections([]);
    setLatestPageData([]);
    setConnectionError(null);
    setView("results");
  }

  function loadFavorite(favorite: FavoriteRoute) {
    cacheStations([favorite.from, favorite.to]);
    setFromStation(favorite.from);
    setToStation(favorite.to);
    setFromResults([]);
    setToResults([]);
    resetDepartureNow();
  }

  function saveFavorite() {
    if (!fromStation || !toStation) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Cannot save favorite",
        message: "Select both stations first.",
      });
      return;
    }

    addFavorite(fromStation, toStation);
    void showToast({
      style: Toast.Style.Success,
      title: "Favorite saved",
      message: `${fromStation.name} → ${toStation.name}`,
    });
  }

  function swapStations() {
    const previousFrom = fromStation;
    setFromStation(toStation);
    setToStation(previousFrom);
  }

  if (view === "results" && fromStation && toStation) {
    const routeTitle = `${fromStation.name} → ${toStation.name}`;
    const canLoadMore = page < 3 && latestPageData.length > 0;

    return (
      <List
        isLoading={isLoadingConnections && page === 0}
        navigationTitle={routeTitle}
        searchBarPlaceholder="Filter connections…"
      >
        {connectionError && !isLoadingConnections ? (
          <List.EmptyView
            title="Could not load connections"
            description={connectionError}
            icon={Icon.ExclamationMark}
          />
        ) : connections.length === 0 && !isLoadingConnections ? (
          <List.EmptyView title="No connections found" icon={Icon.Clock} />
        ) : (
          connections.map((connection, index) => {
            const products = connection.products.join(", ") || "Connection";
            const departureLabel = formatConnectionTime(connection.from.departure);
            const arrivalLabel = formatConnectionTime(connection.to.arrival);

            return (
              <List.Item
                key={`${connection.from.departure ?? ""}-${connection.to.arrival ?? ""}-${index}`}
                title={products}
                subtitle={`${departureLabel} → ${arrivalLabel}`}
                accessories={[
                  { text: connection.duration },
                  {
                    text: `${connection.transfers} transfer${Number(connection.transfers) === 1 ? "" : "s"}`,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in SBB.ch"
                      url={getSbbUrl(fromStation, toStation, date, time)}
                    />
                    <Action
                      title="Copy Departure Time"
                      icon={Icon.Clipboard}
                      onAction={() => Clipboard.copy(departureLabel)}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )}
        {canLoadMore && (
          <List.Item
            title="Show More Connections"
            icon={Icon.Plus}
            accessories={[{ text: `Page ${page + 2}` }]}
            actions={
              <ActionPanel>
                <Action
                  title="Load More"
                  icon={Icon.ArrowDown}
                  onAction={() => setPage((current) => current + 1)}
                />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          title="Back to Search"
          icon={Icon.ArrowLeft}
          actions={
            <ActionPanel>
              <Action title="Back" icon={Icon.ArrowLeft} onAction={() => setView("search")} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <Form
      navigationTitle="Search Connection"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Search Connections"
            icon={Icon.MagnifyingGlass}
            onSubmit={startSearch}
          />
          <Action title="Use Now" icon={Icon.Clock} onAction={resetDepartureNow} />
          <Action title="Swap From/To" icon={Icon.Switch} onAction={swapStations} />
          <Action
            title="Save as Favorite"
            icon={Icon.Star}
            onAction={saveFavorite}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Open on SBB.ch"
            icon={Icon.Globe}
            onAction={() => {
              if (!fromStation || !toStation) {
                return;
              }
              void open(getSbbUrl(fromStation, toStation, date, time));
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="from"
        title="From"
        placeholder="Search departure station…"
        {...(fromStation ? { value: fromStation.id } : {})}
        filtering={false}
        throttle
        isLoading={isSearchingFrom}
        onSearchTextChange={(query) => void searchFromStations(query)}
        onChange={handleFromChange}
      >
        {stationDropdownItems(fromStation, fromResults).map((station) => (
          <Form.Dropdown.Item key={station.id} value={station.id} title={station.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="to"
        title="To"
        placeholder="Search arrival station…"
        {...(toStation ? { value: toStation.id } : {})}
        filtering={false}
        throttle
        isLoading={isSearchingTo}
        onSearchTextChange={(query) => void searchToStations(query)}
        onChange={handleToChange}
      >
        {stationDropdownItems(toStation, toResults).map((station) => (
          <Form.Dropdown.Item key={station.id} value={station.id} title={station.name} />
        ))}
      </Form.Dropdown>
      <Form.DatePicker
        id="departure"
        title="Departure"
        type={Form.DatePicker.Type.DateTime}
        value={departure}
        onChange={(value) => {
          if (value) {
            setDeparture(value);
          }
        }}
      />
      {favorites.length > 0 && (
        <Form.Dropdown
          id="favorite"
          title="Favorites"
          placeholder="Load a saved route"
          onChange={(favoriteId) => {
            const favorite = favorites.find((item) => item.id === favoriteId);
            if (favorite) {
              loadFavorite(favorite);
            }
          }}
        >
          {favorites.map((favorite) => (
            <Form.Dropdown.Item key={favorite.id} value={favorite.id} title={favorite.label} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}
