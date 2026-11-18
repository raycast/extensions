import { useCallback, useEffect, useState } from "react";
import { Action, ActionPanel, Form, getPreferenceValues, Icon, LocalStorage, useNavigation } from "@raycast/api";
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

const STORAGE_KEYS = { FROM: "lastSelectedFrom", TO: "lastSelectedTo" } as const;
const DEFAULTS = { FROM: "Amsterdam Centraal", TO: "Rotterdam Centraal" } as const;

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
  isReady: boolean;
  isLoading: boolean;
  defaultValue?: string;
  stations: StationData;
  onSearchTextChange: (text: string) => void;
  onChange: (value: string) => void;
}

function StationDropdown({
  id,
  title,
  isReady,
  isLoading,
  defaultValue,
  stations,
  onSearchTextChange,
  onChange,
}: StationDropdownProps) {
  return (
    <Form.Dropdown
      id={id}
      title={title}
      filtering
      throttle
      onSearchTextChange={onSearchTextChange}
      onChange={onChange}
      isLoading={!isReady || isLoading}
      defaultValue={defaultValue}
    >
      {isReady &&
        (stations?.payload || []).map((station) => (
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
  const { "save-last-used": saveLastUsed } = getPreferenceValues<Preferences>();

  const [isInitialized, setIsInitialized] = useState(false);
  const [queries, setQueries] = useState({ from: "", to: "" });
  const [defaults, setDefaults] = useState<{ from: string | null; to: string | null } | null>(null);
  const [selected, setSelected] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [swapKey, setSwapKey] = useState(0);

  useEffect(() => {
    async function initialize() {
      let fromName: string = DEFAULTS.FROM;
      let toName: string = DEFAULTS.TO;

      if (saveLastUsed) {
        [fromName, toName] = await Promise.all([
          LocalStorage.getItem<string>(STORAGE_KEYS.FROM).then((v) => v || DEFAULTS.FROM),
          LocalStorage.getItem<string>(STORAGE_KEYS.TO).then((v) => v || DEFAULTS.TO),
        ]);
      }

      setQueries({ from: fromName, to: toName });
      setIsInitialized(true);
    }
    initialize();
  }, [saveLastUsed]);

  const { data: fromStations, isLoading: fromLoading } = useStationSearch(isInitialized ? queries.from : "");
  const { data: toStations, isLoading: toLoading } = useStationSearch(isInitialized ? queries.to : "");

  useEffect(() => {
    if (defaults === null && fromStations && toStations) {
      setDefaults({
        from: findStationCode(fromStations, queries.from),
        to: findStationCode(toStations, queries.to),
      });
    }
  }, [fromStations, toStations, defaults, queries]);

  const isReady = isInitialized && defaults !== null;

  const reverseStations = useCallback(() => {
    const fromCode = selected.from || defaults?.from;
    const toCode = selected.to || defaults?.to;
    if (!fromCode || !toCode) return;

    const fromName = findStationName(fromStations, fromCode);
    const toName = findStationName(toStations, toCode);

    setQueries({ from: toName, to: fromName });
    setDefaults({ from: toCode, to: fromCode });
    setSelected({ from: toCode, to: fromCode });
    setSwapKey((k) => k + 1);
  }, [selected, defaults, fromStations, toStations]);

  const searchTrips = useCallback(
    async (val: Form.Values) => {
      const fromCode = val["from"];
      const toCode = val["to"];

      if (saveLastUsed) {
        await Promise.all([
          LocalStorage.setItem(STORAGE_KEYS.FROM, findStationName(fromStations, fromCode)),
          LocalStorage.setItem(STORAGE_KEYS.TO, findStationName(toStations, toCode)),
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
          <Action
            title="Reverse Direction"
            icon={Icon.Switch}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={reverseStations}
          />
        </ActionPanel>
      }
    >
      <StationDropdown
        key={`from-${swapKey}`}
        id="from"
        title="From"
        isReady={isReady}
        isLoading={fromLoading}
        defaultValue={defaults?.from ?? undefined}
        stations={fromStations}
        onSearchTextChange={(text) => setQueries((q) => ({ ...q, from: text }))}
        onChange={(value) => setSelected((s) => ({ ...s, from: value }))}
      />
      <StationDropdown
        key={`to-${swapKey}`}
        id="to"
        title="To"
        isReady={isReady}
        isLoading={toLoading}
        defaultValue={defaults?.to ?? undefined}
        stations={toStations}
        onSearchTextChange={(text) => setQueries((q) => ({ ...q, to: text }))}
        onChange={(value) => setSelected((s) => ({ ...s, to: value }))}
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
