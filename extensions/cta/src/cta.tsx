import {
  Action,
  ActionPanel,
  Form,
  List,
  useNavigation,
  showToast,
  Toast,
  Color,
  Icon,
  LaunchProps,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  getBusPredictions,
  getBusRoutes,
  getTrainArrivals,
  getBusDirections,
  getBusStops,
  getBusRoutesByStop,
  clearExpiredCache,
} from "./api";
import { BusPrediction, TrainArrival, TransitType, CTA_BUS_API_KEY, CTA_TRAIN_API_KEY } from "./config";
import { addFavoriteStop, getFavoriteStops, isFavoriteStop, removeFavoriteStop, renameFavoriteStop } from "./storage";
import { trainStations, TRAIN_LINES, searchTrainStations, SearchResult, getLineColor } from "./generated/trainStations";

interface FavoriteStop {
  id: string;
  name: string;
  type: TransitType;
  stopName?: string;
}

interface CommandArguments {
  query?: string;
}

interface BusRoute {
  rt: string;
  rtnm: string;
}

interface BusDirection {
  dir: string;
}

interface BusStop {
  stpid: string;
  stpnm: string;
  lat: number;
  lon: number;
}

interface BusSearchState {
  step: "route" | "direction" | "stop";
  selectedRoute?: string;
  selectedDirection?: string;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Component for renaming favorites
function RenameFavoriteForm({
  favorite,
  onSubmit,
  onCancel,
}: {
  favorite: FavoriteStop;
  onSubmit: (newName: string) => void;
  onCancel: () => void;
}) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={({ name }) => {
              // If name is empty or just whitespace, use the original stopName
              const newName = (name as string).trim() || favorite.stopName || favorite.name;
              onSubmit(newName);
            }}
          />
          <Action title="Cancel" onAction={onCancel} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={favorite.name}
        placeholder={favorite.stopName || favorite.name}
      />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: CommandArguments }>) {
  const { push, pop } = useNavigation();
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const [transitType, setTransitType] = useState<TransitType>(() => {
    if (props.arguments.query) {
      return /^\d+$/.test(props.arguments.query) ? "bus" : "train";
    }
    if (CTA_BUS_API_KEY) return "bus";
    if (CTA_TRAIN_API_KEY) return "train";
    return "bus";
  });
  const [isLoading, setIsLoading] = useState(true);
  const [predictions, setPredictions] = useState<BusPrediction[] | TrainArrival[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [favorites, setFavorites] = useState<FavoriteStop[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);
  const [trainSearchResults, setTrainSearchResults] = useState<SearchResult>({ type: "station", stations: [] });
  const [busRoutes, setBusRoutes] = useState<BusRoute[]>([]);
  const [busDirections, setBusDirections] = useState<BusDirection[]>([]);
  const [busStops, setBusStops] = useState<BusStop[]>([]);
  const [busSearchState, setBusSearchState] = useState<BusSearchState>({ step: "route" });
  const [busRoutesByStop, setBusRoutesByStop] = useState<Record<string, string[]>>({});

  const availableTransitTypes = [
    ...(CTA_BUS_API_KEY ? [{ title: "Bus", value: "bus" as const }] : []),
    ...(CTA_TRAIN_API_KEY ? [{ title: "Train", value: "train" as const }] : []),
  ];

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setIsLoadingFavorites(true);
    const favs = await getFavoriteStops();
    setFavorites(favs);
    setIsLoadingFavorites(false);
  };

  const toggleFavorite = async (id: string, type: TransitType, stopName: string) => {
    const isFavorite = await isFavoriteStop(id, type);
    if (isFavorite) {
      await removeFavoriteStop(id, type);
      showToast({ style: Toast.Style.Success, title: "Removed from favorites" });
    } else {
      const name = stopName;
      await addFavoriteStop({ id, type, name, stopName });
      showToast({ style: Toast.Style.Success, title: "Added to favorites" });
    }
    loadFavorites();
  };

  const renameFavorite = async (id: string, type: TransitType, newName: string) => {
    await renameFavoriteStop(id, type, newName);
    showToast({ style: Toast.Style.Success, title: "Renamed favorite stop" });
    loadFavorites();
  };

  const fetchPredictions = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);

        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Loading arrivals...",
        });

        const predictions = transitType === "bus" ? await getBusPredictions(id) : await getTrainArrivals(id);

        setPredictions(predictions);
        setLastUpdate(new Date());
        toast.hide();
      } catch (e) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch predictions",
          message: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [transitType],
  );

  // Use our custom debounce hook
  const debouncedSearchText = useDebounce(searchText, 300);

  // Replace the existing search effects with debounced versions
  useEffect(() => {
    if (transitType === "train" && debouncedSearchText) {
      const results = searchTrainStations(debouncedSearchText);
      setTrainSearchResults(results);

      if (results.type === "station" && results.stations.length === 1) {
        fetchPredictions(results.stations[0].id);
      } else {
        setPredictions([]);
      }
    }
  }, [debouncedSearchText, transitType]);

  useEffect(() => {
    if (transitType === "bus" && debouncedSearchText.length > 0) {
      // Only fetch predictions if the search text is a stop ID (4+ digits)
      if (/^\d{4,}$/.test(debouncedSearchText)) {
        fetchPredictions(debouncedSearchText);
      }
    }
  }, [debouncedSearchText, transitType, fetchPredictions]);

  // Special handling for initial query argument
  useEffect(() => {
    if (props.arguments.query) {
      setSearchText(props.arguments.query);
    }
  }, [props.arguments.query]);

  // Clear predictions when search text is empty
  useEffect(() => {
    if (!searchText) {
      setPredictions([]);
      setLastUpdate(null);
    }
  }, [searchText]);

  const formatTime = (time: string) => {
    if (transitType === "bus") {
      return time;
    }
    const date = new Date(time);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatLastUpdate = () => {
    if (!lastUpdate) return "";
    return `Updated ${lastUpdate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  };

  const renderAccessories = (prediction: BusPrediction | TrainArrival) => {
    if (transitType === "bus") {
      const busPrediction = prediction as BusPrediction;
      const isDue = busPrediction.prdctdn === "DUE";
      const minutes = isDue ? 0 : parseInt(busPrediction.prdctdn);

      return [
        {
          text: {
            color: isDue ? Color.Red : minutes <= 5 ? Color.Red : minutes <= 10 ? Color.Orange : Color.Green,
            value: isDue ? "Due" : `${minutes} min`,
          },
          tooltip: `Arriving at ${busPrediction.prdtm}`,
        },
      ];
    } else {
      const trainPrediction = prediction as TrainArrival;
      try {
        const [datePart, timePart] = trainPrediction.arrT.split("T");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes, seconds] = timePart.split(":").map(Number);

        const arrivalTimestamp = Date.UTC(year, month - 1, day, hours + 6, minutes, seconds);
        const now = Date.now();

        const minutesUntil = Math.round((arrivalTimestamp - now) / 60000);
        const isDelayed = trainPrediction.isDly === "1";
        const isDue = minutesUntil < 2;

        // Only show green if due (< 2 minutes), otherwise use default color
        // Always show red if delayed
        const textColor = isDelayed ? Color.Red : isDue ? Color.Green : Color.PrimaryText;

        const timeText = isDue ? "Due" : `${minutesUntil} min`;

        return [
          {
            text: {
              color: textColor,
              value: `${formatTime(trainPrediction.arrT)} (${timeText})`,
            },
          },
          ...(isDelayed
            ? [
                {
                  text: "Delayed",
                  tooltip: "This train is experiencing delays",
                },
              ]
            : []),
        ];
      } catch (error) {
        console.error("Error parsing date:", error, trainPrediction.arrT);
        return [
          {
            text: {
              color: trainPrediction.isDly === "1" ? Color.Red : Color.PrimaryText,
              value: formatTime(trainPrediction.arrT),
            },
          },
        ];
      }
    }
  };

  const renderActions = (prediction: BusPrediction | TrainArrival) => {
    const stopId = transitType === "bus" ? (prediction as BusPrediction).stpid : (prediction as TrainArrival).staId;

    const stopName = transitType === "bus" ? (prediction as BusPrediction).stpnm : (prediction as TrainArrival).staNm;

    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action
            icon={Icon.ArrowLeft}
            title="Go Back"
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={() => setSearchText("")}
          />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action
            icon={Icon.Star}
            title="Toggle Favorite Stop"
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => toggleFavorite(stopId, transitType, stopName)}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  };

  const renderFavoriteActions = (favorite: FavoriteStop) => (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.MagnifyingGlass}
          title="View Route"
          onAction={() => {
            setTransitType(favorite.type);
            setSearchText(favorite.id);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          icon={Icon.Pencil}
          title="Rename Favorite"
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={() => {
            push(
              <RenameFavoriteForm
                favorite={favorite}
                onSubmit={async (newName) => {
                  await renameFavorite(favorite.id, favorite.type, newName);
                  pop();
                }}
                onCancel={() => pop()}
              />,
            );
          }}
        />
        <Action
          icon={Icon.Trash}
          title="Remove from Favorites"
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={async () => {
            await removeFavoriteStop(favorite.id, favorite.type);
            loadFavorites();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  const renderTrainSearchResults = () => {
    if (!searchText || transitType !== "train" || predictions.length > 0) return null;

    const title = trainSearchResults.type === "line" ? `${trainSearchResults.line} Line Stations` : "Matching Stations";

    return (
      <List.Section title={title}>
        {trainSearchResults.stations.map((station) => (
          <List.Item
            key={station.id}
            icon={Icon.Train}
            title={station.name}
            subtitle={`Station ID: ${station.id}`}
            accessories={station.lines.map((line) => ({
              tag: {
                value: line,
                color: {
                  light: getLineColor(line),
                  dark: getLineColor(line),
                  adjustContrast: false,
                },
              },
            }))}
            actions={
              <ActionPanel>
                <Action title="View Arrivals" onAction={() => fetchPredictions(station.id)} />
                <Action
                  icon={Icon.Star}
                  title="Toggle Favorite"
                  onAction={() => toggleFavorite(station.id, "train", station.name)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  };

  const validateApiKeys = () => {
    if (!CTA_BUS_API_KEY && !CTA_TRAIN_API_KEY) {
      return (
        <List>
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="No API Keys Set"
            description="Please set at least one API key in extension preferences"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Get Bus Api Key"
                  url="http://www.transitchicago.com/developers/bustracker.aspx"
                />
                <Action.OpenInBrowser
                  title="Get Train Api Key"
                  url="http://www.transitchicago.com/developers/traintracker.aspx"
                />
              </ActionPanel>
            }
          />
        </List>
      );
    }
    return null;
  };

  useEffect(() => {
    if (transitType === "bus") {
      getBusRoutes().then((routes) => setBusRoutes(routes));
    }
  }, [transitType]);

  useEffect(() => {
    if (transitType === "bus" && busSearchState.selectedRoute) {
      getBusDirections(busSearchState.selectedRoute).then((directions) => setBusDirections(directions));
    }
  }, [transitType, busSearchState.selectedRoute]);

  useEffect(() => {
    if (transitType === "bus" && busSearchState.selectedRoute && busSearchState.selectedDirection) {
      console.log("Fetching stops for:", busSearchState.selectedRoute, busSearchState.selectedDirection);
      getBusStops(busSearchState.selectedRoute, busSearchState.selectedDirection).then((stops) => {
        console.log("Received stops:", stops.length);
        setBusStops(stops);
      });
    }
  }, [transitType, busSearchState.selectedRoute, busSearchState.selectedDirection]);

  useEffect(() => {
    const fetchBusRoutes = async () => {
      const busStops = favorites.filter((f) => f.type === "bus");
      const routes: Record<string, string[]> = {};

      for (const stop of busStops) {
        const stopRoutes = await getBusRoutesByStop(stop.id);
        if (stopRoutes.length > 0) {
          routes[stop.id] = stopRoutes;
        }
      }

      setBusRoutesByStop(routes);
    };

    if (favorites.length > 0) {
      fetchBusRoutes();
    }
  }, [favorites]);

  const renderBusSearch = () => {
    if (transitType !== "bus" || predictions.length > 0 || !searchText) return null;

    // Check if input is a route number (non-numeric or 1-3 digits)
    const isRouteSearch = /^\d{1,3}$/.test(searchText) || /^[a-zA-Z]/i.test(searchText);
    const isStopIdSearch = /^\d{4,}$/.test(searchText);

    // Don't show route search if we're looking for a stop ID
    if (isStopIdSearch) return null;

    if (busSearchState.step === "direction" && busSearchState.selectedRoute) {
      return (
        <List.Section title={`Route ${busSearchState.selectedRoute} Directions`}>
          {busDirections.map((direction) => (
            <List.Item
              key={direction.dir}
              icon={Icon.ArrowRight}
              title={direction.dir}
              actions={
                <ActionPanel>
                  <Action
                    title="Select Direction"
                    onAction={() =>
                      setBusSearchState({
                        ...busSearchState,
                        step: "stop",
                        selectedDirection: direction.dir,
                      })
                    }
                  />
                  <Action
                    icon={Icon.ArrowLeft}
                    title="Back to Routes"
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => {
                      setBusSearchState({ step: "route" });
                      setBusDirections([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      );
    }

    if (busSearchState.step === "stop" && busSearchState.selectedDirection) {
      // Only filter stops if there's additional search text beyond the route number
      const searchTerms = searchText
        .toLowerCase()
        .replace(busSearchState.selectedRoute || "", "")
        .trim();
      const filteredStops = searchTerms
        ? busStops.filter((stop) => stop.stpnm.toLowerCase().includes(searchTerms) || stop.stpid.includes(searchTerms))
        : busStops;

      return (
        <List.Section
          title={`Route ${busSearchState.selectedRoute} Stops (${busSearchState.selectedDirection})`}
          subtitle={`${filteredStops.length} stops`}
        >
          {filteredStops.map((stop) => (
            <List.Item
              key={stop.stpid}
              icon={Icon.Map}
              title={stop.stpnm}
              subtitle={`Stop ID: ${stop.stpid}`}
              actions={
                <ActionPanel>
                  <Action
                    title="View Predictions"
                    onAction={() => {
                      setSearchText(stop.stpid);
                      fetchPredictions(stop.stpid);
                    }}
                  />
                  <Action
                    icon={Icon.Star}
                    title="Add to Favorites"
                    onAction={() => toggleFavorite(stop.stpid, "bus", stop.stpnm)}
                  />
                  <Action
                    icon={Icon.ArrowLeft}
                    title="Back to Directions"
                    shortcut={{ modifiers: ["cmd"], key: "[" }}
                    onAction={() => {
                      setBusSearchState({
                        step: "direction",
                        selectedRoute: busSearchState.selectedRoute,
                      });
                      setBusStops([]);
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      );
    }

    // Only show routes if we're in the 'route' step
    if (busSearchState.step === "route" && isRouteSearch) {
      const filteredRoutes = busRoutes.filter(
        (route) =>
          route.rt.toLowerCase().includes(searchText.toLowerCase()) ||
          route.rtnm.toLowerCase().includes(searchText.toLowerCase()),
      );

      if (filteredRoutes.length > 0) {
        return (
          <List.Section title="Bus Routes">
            {filteredRoutes.map((route) => (
              <List.Item
                key={route.rt}
                icon={Icon.Car}
                title={`Route ${route.rt} - ${route.rtnm}`}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select Route"
                      onAction={() =>
                        setBusSearchState({
                          step: "direction",
                          selectedRoute: route.rt,
                        })
                      }
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      }
    }

    return null;
  };

  // Add this effect to clean up expired cache entries when the component mounts
  useEffect(() => {
    clearExpiredCache();
  }, []);

  if (availableTransitTypes.length === 0) {
    return validateApiKeys();
  }

  return (
    <List
      isLoading={isLoading || isLoadingFavorites}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        transitType === "bus" ? "Enter stop ID or route number..." : "Search by station name, line color, or ID..."
      }
      navigationTitle={transitType === "bus" ? "CTA Bus Tracker" : "CTA Train Tracker"}
      searchBarAccessory={
        availableTransitTypes.length > 1 ? (
          <List.Dropdown
            tooltip="Select Transit Type"
            value={transitType}
            onChange={(newValue) => {
              setTransitType(newValue as TransitType);
              // Clear search and predictions when switching transit types
              setSearchText("");
              setPredictions([]);
              setLastUpdate(null);
              // Reset bus search state
              setBusSearchState({ step: "route" });
              setBusDirections([]);
              setBusStops([]);
            }}
          >
            {availableTransitTypes.map((type) => (
              <List.Dropdown.Item
                key={type.value}
                title={type.title}
                value={type.value}
                icon={type.value === "bus" ? Icon.Car : Icon.Train}
              />
            ))}
          </List.Dropdown>
        ) : null
      }
    >
      {!searchText && (
        <>
          <List.Section title="⭐️ Favorites" subtitle={favorites.length > 0 ? `${favorites.length} stops` : undefined}>
            {favorites.length > 0 ? (
              favorites.map((favorite) => {
                const trainStation =
                  favorite.type === "train" ? trainStations.find((station) => station.id === favorite.id) : null;

                const busRoutes = favorite.type === "bus" ? busRoutesByStop[favorite.id] : null;

                return (
                  <List.Item
                    key={`${favorite.type}-${favorite.id}`}
                    icon={favorite.type === "bus" ? Icon.Car : Icon.Train}
                    title={favorite.name}
                    subtitle={`${favorite.id}`}
                    accessories={
                      favorite.type === "train" && trainStation
                        ? trainStation.lines.map((line) => ({
                            tag: {
                              value: line,
                              color: {
                                light: getLineColor(line),
                                dark: getLineColor(line),
                                adjustContrast: false,
                              },
                            },
                          }))
                        : busRoutes
                          ? busRoutes.map((route) => ({
                              tag: {
                                value: route,
                                color: Color.SecondaryText,
                              },
                            }))
                          : []
                    }
                    actions={renderFavoriteActions(favorite)}
                  />
                );
              })
            ) : (
              <List.Item
                title="No Favorites Yet"
                icon={Icon.Star}
                subtitle="Add stops you frequently check to access them quickly"
                accessories={[
                  {
                    tag: {
                      value: "Tip: Use ⌘F to favorite",
                      color: Color.SecondaryText,
                    },
                  },
                ]}
              />
            )}
          </List.Section>

          {transitType === "train" && (
            <List.Section title="Train Lines" subtitle="Select a line to view stations">
              {TRAIN_LINES.map((line) => (
                <List.Item
                  key={line.name}
                  icon={Icon.Train}
                  title={`${line.name} Line`}
                  accessories={[
                    {
                      tag: {
                        value: line.name,
                        color: line.color,
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action title={`View ${line.name} Line Stations`} onAction={() => setSearchText(line.name)} />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}
        </>
      )}

      {renderBusSearch()}

      {renderTrainSearchResults()}

      {predictions.length > 0 ? (
        <List.Section
          title={
            transitType === "bus"
              ? `Bus Stop: ${(predictions[0] as BusPrediction).stpnm}`
              : `Station: ${(predictions[0] as TrainArrival).staNm}`
          }
          subtitle={formatLastUpdate()}
        >
          {predictions.map((prediction, index) => {
            if (transitType === "bus") {
              const busPrediction = prediction as BusPrediction;
              return (
                <List.Item
                  key={index}
                  icon={Icon.Car}
                  title={`${busPrediction.rt} - ${busPrediction.rtdir}`}
                  subtitle={`Bus #${busPrediction.vid}`}
                  accessories={renderAccessories(busPrediction)}
                  actions={renderActions(busPrediction)}
                />
              );
            } else {
              const trainPrediction = prediction as TrainArrival;

              // Map CTA API codes to our line names
              const lineCodeToName: Record<string, string> = {
                Red: "Red",
                Blue: "Blue",
                Brn: "Brown",
                G: "Green",
                Org: "Orange",
                P: "Purple",
                Pink: "Pink",
                Y: "Yellow",
              };

              return (
                <List.Item
                  key={index}
                  icon={{
                    source: Icon.Train,
                    tintColor: getLineColor(lineCodeToName[trainPrediction.rt] || trainPrediction.rt),
                  }}
                  title={`${trainPrediction.rt} Line to ${trainPrediction.destNm}`}
                  subtitle={trainPrediction.staNm}
                  accessories={renderAccessories(trainPrediction)}
                  actions={renderActions(trainPrediction)}
                />
              );
            }
          })}
        </List.Section>
      ) : searchText.length > 0 ? (
        <List.EmptyView
          icon={isLoading ? Icon.CircleProgress : "magnifying-glass"}
          title={
            isLoading
              ? "Loading..."
              : predictions.length === 0 && lastUpdate
                ? "No Arrivals Currently"
                : "No Arrivals Found"
          }
          description={
            predictions.length === 0 && lastUpdate
              ? "There are no upcoming arrivals for this stop. Check back in a few minutes."
              : transitType === "bus"
                ? "Enter a valid bus stop ID to see predictions"
                : "Search by station name, line color, or station ID"
          }
          actions={
            <ActionPanel>
              <Action title="Clear Search" icon={Icon.XMarkCircle} onAction={() => setSearchText("")} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={transitType === "bus" ? "bus" : "train"}
          title={`Enter a ${transitType} stop ID`}
          description="Search for a stop ID to see arrival predictions"
        />
      )}
    </List>
  );
}
