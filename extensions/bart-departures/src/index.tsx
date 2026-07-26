import { Action, ActionPanel, Color, Icon, List, LocalStorage } from '@raycast/api';
import { capitalize, compact, isPlainObject, isString } from 'lodash';
import { useCallback, useEffect, useState } from 'react';
import { getDepartures, getStations } from './bart-api';
import type { Station, Departure } from './bart-api';

const LAST_STATION_KEY = 'last-selected-station';
const SCREEN = {
  DEPARTURES: 'departures',
  STATIONS: 'stations',
} as const;
const BART_LINE_COLORS: Record<string, Color> = {
  blue: Color.Blue,
  green: Color.Green,
  orange: Color.Orange,
  red: Color.Red,
  yellow: Color.Yellow,
};

type Screen =
  | { name: typeof SCREEN.DEPARTURES; station: Station }
  | { name: typeof SCREEN.STATIONS };

const BARTDepartures = () => {
  const [screen, setScreen] = useState<Screen>();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    void LocalStorage.getItem<string>(LAST_STATION_KEY).then((savedStation) => {
      const station = parseStation(savedStation);
      setScreen(station ? { name: SCREEN.DEPARTURES, station } : { name: SCREEN.STATIONS });
    });
  }, []);

  const selectStation = useCallback(async (station: Station) => {
    setSearchText('');
    await LocalStorage.setItem(LAST_STATION_KEY, JSON.stringify(station));
    setScreen({ name: SCREEN.DEPARTURES, station });
  }, []);

  const changeStation = useCallback(() => {
    setSearchText('');
    setScreen({ name: SCREEN.STATIONS });
  }, []);

  if (!screen) {
    return <List isLoading searchBarPlaceholder="Loading BART Departures" />;
  }

  if (screen.name === SCREEN.STATIONS) {
    return (
      <StationPicker
        onSelect={selectStation}
        searchText={searchText}
        onSearchTextChange={setSearchText}
      />
    );
  }

  return (
    <DeparturesList
      station={screen.station}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      onChangeStation={changeStation}
    />
  );
};

const StationPicker = ({
  onSelect,
  searchText,
  onSearchTextChange,
}: {
  onSelect: (station: Station) => Promise<void>;
  searchText: string;
  onSearchTextChange: (text: string) => void;
}) => {
  const loadStations = useCallback(() => getStations(), []);
  const { data: stations, error, isLoading, reload } = useResource(loadStations);

  return (
    <List
      isLoading={isLoading}
      filtering
      searchText={searchText}
      searchBarPlaceholder="Search BART stations"
      onSearchTextChange={onSearchTextChange}
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
            subtitle={compact([station.abbr, station.city]).join(' · ')}
            actions={
              <ActionPanel>
                <Action
                  title="Show Departures"
                  icon={Icon.Train}
                  onAction={() => onSelect(station)}
                />
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
  searchText,
  onSearchTextChange,
  onChangeStation,
}: {
  station: Station;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  onChangeStation: () => void;
}) => {
  const loadDepartures = useCallback(() => getDepartures(station.abbr), [station.abbr]);
  const { data: departures, error, isLoading, reload } = useResource(loadDepartures);
  const actions = <DepartureActions onRefresh={reload} onChangeStation={onChangeStation} />;

  return (
    <List
      isLoading={isLoading}
      filtering
      searchText={searchText}
      searchBarPlaceholder={`Filter departures from ${station.name}`}
      onSearchTextChange={onSearchTextChange}
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
        departures.map((departure) => (
          <DepartureItem key={departure.id} departure={departure} actions={actions} />
        ))
      )}
    </List>
  );
};

const DepartureItem = ({
  departure,
  actions,
}: {
  departure: Departure;
  actions: React.ReactNode;
}) => {
  const line = departure.line === 'Unknown' ? departure.line : `${capitalize(departure.line)} Line`;
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

const DepartureActions = ({
  onRefresh,
  onChangeStation,
}: {
  onRefresh: () => void;
  onChangeStation: () => void;
}) => {
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
        if (isCurrent)
          setError(loadError instanceof Error ? loadError.message : 'Something went wrong.');
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

const formatMinutes = (minutes: string): string =>
  minutes.toLowerCase() === 'leaving' ? 'Leaving' : `${minutes} min`;

const getLineColor = (line: string): Color =>
  BART_LINE_COLORS[line.toLowerCase()] ?? Color.SecondaryText;

export default BARTDepartures;
