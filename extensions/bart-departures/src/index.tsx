import { Action, ActionPanel, Color, Icon, List, LocalStorage, useNavigation } from "@raycast/api";
import { capitalize, compact, isPlainObject, isString } from "lodash";
import { useCallback, useEffect, useState } from "react";
import { getDepartures, getStations } from "./bart-api";
import type { Station, Departure } from "./bart-api";

const LAST_STATION_KEY = "last-selected-station";
const BART_LINE_COLORS: Record<string, Color> = {
  blue: Color.Blue,
  green: Color.Green,
  orange: Color.Orange,
  red: Color.Red,
  yellow: Color.Yellow,
};

const BARTDepartures = () => {
  const [station, setStation] = useState<Station | undefined>();
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    void (async () => {
      try {
        const savedStation = parseStation(await LocalStorage.getItem<string>(LAST_STATION_KEY));
        if (isCurrent && savedStation) setStation(savedStation);
      } catch {
        // Fall back to the station picker if the saved station cannot be read.
      } finally {
        if (isCurrent) setIsRestoring(false);
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, []);

  const selectStation = useCallback(async (selectedStation: Station) => {
    try {
      await LocalStorage.setItem(LAST_STATION_KEY, JSON.stringify(selectedStation));
    } catch {
      // Continue even if the station cannot be saved locally.
    }

    setStation(selectedStation);
  }, []);

  if (isRestoring) {
    return <List isLoading searchBarPlaceholder="Loading BART Departures" />;
  }

  if (!station) {
    return <StationPicker onSelect={selectStation} />;
  }

  return <DeparturesList station={station} onStationChange={selectStation} />;
};

const StationPicker = ({
  onSelect,
  navigationTitle,
  popOnSelect = false,
}: {
  onSelect: (station: Station) => Promise<void>;
  navigationTitle?: string;
  popOnSelect?: boolean;
}) => {
  const { pop } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const loadStations = useCallback(() => getStations(), []);
  const { data: stations, error, isLoading, reload } = useResource(loadStations);

  const handleSelect = useCallback(
    async (selectedStation: Station) => {
      await onSelect(selectedStation);
      if (popOnSelect) pop();
    },
    [onSelect, pop, popOnSelect],
  );

  return (
    <List
      isLoading={isLoading}
      filtering
      navigationTitle={navigationTitle}
      searchText={searchText}
      searchBarPlaceholder="Search BART stations"
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Stations"
          description={error}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={reload} />
            </ActionPanel>
          }
        />
      ) : (
        stations.map((station) => (
          <List.Item
            key={station.abbr}
            icon={Icon.Train}
            title={station.name}
            subtitle={compact([station.abbr, station.city]).join(" · ")}
            actions={
              <ActionPanel>
                <Action title="Show Departures" icon={Icon.Train} onAction={() => handleSelect(station)} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
};

const DeparturesList = ({
  station,
  onStationChange,
}: {
  station: Station;
  onStationChange: (station: Station) => Promise<void>;
}) => {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const loadDepartures = useCallback(() => getDepartures(station.abbr), [station.abbr]);
  const { data: departures, error, isLoading, reload } = useResource(loadDepartures);

  const changeStation = useCallback(() => {
    push(<StationPicker onSelect={onStationChange} navigationTitle="Select Station" popOnSelect />);
  }, [push, onStationChange]);

  const actions = <DepartureActions onRefresh={reload} onChangeStation={changeStation} />;

  return (
    <List
      isLoading={isLoading}
      filtering
      searchText={searchText}
      searchBarPlaceholder={`Filter departures from ${station.name}`}
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't Load Departures"
          description={error}
          actions={actions}
        />
      ) : departures.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Train}
          title="No Active Departures"
          description={`BART has no active departure estimates for ${station.name}.`}
          actions={actions}
        />
      ) : (
        departures.map((departure) => <DepartureItem key={departure.id} departure={departure} actions={actions} />)
      )}
    </List>
  );
};

const DepartureItem = ({ departure, actions }: { departure: Departure; actions: React.ReactNode }) => {
  const line = departure.line === "Unknown" ? departure.line : `${capitalize(departure.line)} Line`;
  const tintColor = getLineColor(departure.line);
  const accessories: List.Item.Accessory[] = [
    { text: formatMinutes(departure.minutes) },
    { icon: { source: Icon.CircleFilled, tintColor }, text: line },
    ...(departure.platform ? [{ text: `Platform ${departure.platform}` }] : []),
    ...(departure.direction ? [{ text: departure.direction }] : []),
  ];

  return (
    <List.Item
      icon={{ source: Icon.Train, tintColor }}
      title={departure.destination}
      accessories={accessories}
      actions={actions}
    />
  );
};

const DepartureActions = ({ onRefresh, onChangeStation }: { onRefresh: () => void; onChangeStation: () => void }) => {
  return (
    <ActionPanel>
      <Action title="Refresh Departures" icon={Icon.ArrowClockwise} onAction={onRefresh} />
      <Action title="Change Station" icon={Icon.List} onAction={onChangeStation} />
    </ActionPanel>
  );
};

const useResource = <T,>(load: () => Promise<T>) => {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((value) => value + 1), []);

  useEffect(() => {
    let isCurrent = true;

    setIsLoading(true);
    setError(undefined);
    void load()
      .then((result) => {
        if (isCurrent) setData(result);
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Something went wrong.");
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [load, reloadToken]);

  return { data: data ?? [], error, isLoading, reload };
};

const parseStation = (value: string | undefined): Station | undefined => {
  if (!value) return undefined;

  try {
    const candidate: unknown = JSON.parse(value);
    if (!isPlainObject(candidate)) return undefined;

    const station = candidate as Partial<Station>;
    if (!isString(station.name) || !isString(station.abbr)) return undefined;

    return {
      name: station.name,
      abbr: station.abbr,
      city: isString(station.city) ? station.city : undefined,
    };
  } catch {
    return undefined;
  }
};

const formatMinutes = (minutes: string): string => (minutes.toLowerCase() === "leaving" ? "Leaving" : `${minutes} min`);

const getLineColor = (line: string): Color => BART_LINE_COLORS[line.toLowerCase()] ?? Color.SecondaryText;

export default BARTDepartures;
