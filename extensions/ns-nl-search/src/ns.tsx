import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Form, getPreferenceValues, LocalStorage, useNavigation } from "@raycast/api";
import { useStationSearch } from "./api/client";
import { Trips } from "./components/Trips";

export type Trip = {
  id: string;
  from: string;
  to: string;
};

interface Preferences {
  "save-last-used": boolean;
}

const STORAGE_KEYS = {
  FROM: "lastSelectedFrom",
  TO: "lastSelectedTo",
} as const;

const DEFAULTS = {
  FROM: "Amsterdam Centraal",
  TO: "Rotterdam Centraal",
} as const;

async function loadCachedStation(key: string, defaultName: string) {
  const name = await LocalStorage.getItem<string>(key);
  return name || defaultName;
}

async function saveCachedStation(key: string, name: string) {
  await LocalStorage.setItem(key, name);
}

type StationData = { payload: { UICCode: string; namen?: { lang?: string } }[] } | undefined;

function findStationCode(stations: StationData, name: string): string | null {
  return stations?.payload.find((s) => s.namen?.lang === name)?.UICCode || null;
}

function findStationName(stations: StationData, code: string): string {
  return stations?.payload.find((s) => s.UICCode === code)?.namen?.lang || code;
}

interface StationDropdownProps {
  id: string;
  title: string;
  isInitialized: boolean;
  isLoading: boolean;
  defaultValue?: string;
  stations: { payload: { UICCode: string; namen?: { lang?: string } }[] } | undefined;
  onSearchTextChange: (text: string) => void;
}

function StationDropdown({
  id,
  title,
  isInitialized,
  isLoading,
  defaultValue,
  stations,
  onSearchTextChange,
}: StationDropdownProps) {
  return (
    <Form.Dropdown
      id={id}
      title={title}
      filtering
      throttle
      onSearchTextChange={onSearchTextChange}
      isLoading={!isInitialized || isLoading}
      defaultValue={defaultValue}
    >
      {isInitialized &&
        (stations || { payload: [] }).payload.map((station) => (
          <Form.Dropdown.Item
            key={station.UICCode}
            value={station.UICCode}
            title={station.namen?.lang || station.UICCode}
          />
        ))}
    </Form.Dropdown>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const preferences = getPreferenceValues<Preferences>();
  const saveLastUsed = preferences["save-last-used"];

  const [isInitialized, setIsInitialized] = useState(false);
  const [fromStationQuery, setFromStationQuery] = useState<string>("");
  const [toStationQuery, setToStationQuery] = useState<string>("");
  const [defaults, setDefaults] = useState<{ from: string | null; to: string | null } | null>(null);

  useEffect(() => {
    async function initialize() {
      let fromName: string;
      let toName: string;

      if (saveLastUsed) {
        [fromName, toName] = await Promise.all([
          loadCachedStation(STORAGE_KEYS.FROM, DEFAULTS.FROM),
          loadCachedStation(STORAGE_KEYS.TO, DEFAULTS.TO),
        ]);
      } else {
        fromName = DEFAULTS.FROM;
        toName = DEFAULTS.TO;
      }

      setFromStationQuery(fromName);
      setToStationQuery(toName);
      setIsInitialized(true);
    }

    initialize();
  }, [saveLastUsed]);

  const { data: fromStations, isLoading: fromStationsIsLoading } = useStationSearch(
    isInitialized ? fromStationQuery : "",
  );
  const { data: toStations, isLoading: toStationsIsLoading } = useStationSearch(isInitialized ? toStationQuery : "");

  useEffect(() => {
    if (defaults === null && fromStations && toStations) {
      setDefaults({
        from: findStationCode(fromStations, fromStationQuery),
        to: findStationCode(toStations, toStationQuery),
      });
    }
  }, [fromStations, toStations, defaults, fromStationQuery, toStationQuery]);

  const isReady = isInitialized && defaults !== null;

  const searchTrips = useCallback(
    async (val: Form.Values) => {
      const fromCode = val["from"];
      const toCode = val["to"];

      if (saveLastUsed) {
        await Promise.all([
          saveCachedStation(STORAGE_KEYS.FROM, findStationName(fromStations, fromCode)),
          saveCachedStation(STORAGE_KEYS.TO, findStationName(toStations, toCode)),
        ]);
      }

      push(
        <Trips
          fromStation={fromCode}
          toStation={toCode}
          searchArrival={val["direction"] === "arrival"}
          date={val["when"]}
        />,
      );
    },
    [fromStations, toStations, saveLastUsed, push],
  );

  const now = new Date();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Search Trips" onSubmit={searchTrips} />
        </ActionPanel>
      }
    >
      <StationDropdown
        id="from"
        title="From"
        isInitialized={isReady}
        isLoading={fromStationsIsLoading}
        defaultValue={defaults?.from || undefined}
        stations={fromStations}
        onSearchTextChange={setFromStationQuery}
      />

      <StationDropdown
        id="to"
        title="To"
        isInitialized={isReady}
        isLoading={toStationsIsLoading}
        defaultValue={defaults?.to || undefined}
        stations={toStations}
        onSearchTextChange={setToStationQuery}
      />

      <Form.Separator />
      <Form.Dropdown id="direction" title="Time to" defaultValue="departure">
        <Form.Dropdown.Item key="departure" value="departure" title="Departure" />
        <Form.Dropdown.Item key="arrival" value="arrival" title="Arrival" />
      </Form.Dropdown>
      <Form.DatePicker
        id="when"
        title="Date"
        defaultValue={new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes())}
      />
    </Form>
  );
}
