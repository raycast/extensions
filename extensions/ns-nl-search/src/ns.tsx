import { useCallback, useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Form, getPreferenceValues, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { useStations } from "./api/client";
import { Station } from "./api/types";
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

type Selection = { from: string; to: string };

function stationName(station: Station): string {
  return station.namen?.lang || station.UICCode;
}

interface StationDropdownProps {
  id: string;
  title: string;
  isLoading: boolean;
  defaultValue?: string;
  stations: Station[];
  onChange: (value: string) => void;
}

function StationDropdown({ id, title, isLoading, defaultValue, stations, onChange }: StationDropdownProps) {
  return (
    <Form.Dropdown
      id={id}
      title={title}
      filtering
      isLoading={isLoading}
      defaultValue={defaultValue}
      onChange={onChange}
    >
      {stations.map((station) => (
        <Form.Dropdown.Item
          key={station.UICCode}
          value={station.UICCode}
          title={stationName(station)}
          keywords={[station.code, ...(station.synoniemen ?? [])].filter((k): k is string => Boolean(k))}
        />
      ))}
    </Form.Dropdown>
  );
}

export default function Command() {
  const { push } = useNavigation();
  const { "save-last-used": saveLastUsed } = getPreferenceValues<Preferences>();

  const { data, isLoading } = useStations();
  const stations = useMemo(() => data?.payload ?? [], [data]);

  const { codeByName, nameByCode } = useMemo(() => {
    const codeByName = new Map<string, string>();
    const nameByCode = new Map<string, string>();
    for (const station of stations) {
      const name = stationName(station);
      if (!codeByName.has(name)) codeByName.set(name, station.UICCode);
      nameByCode.set(station.UICCode, name);
    }
    return { codeByName, nameByCode };
  }, [stations]);

  const [savedNames, setSavedNames] = useState<Selection | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [swapKey, setSwapKey] = useState(0);

  // Load the last used station names (names, not codes: codes may change).
  useEffect(() => {
    if (!saveLastUsed) {
      setSavedNames({ from: DEFAULTS.FROM, to: DEFAULTS.TO });
      return;
    }
    Promise.all([LocalStorage.getItem<string>(STORAGE_KEYS.FROM), LocalStorage.getItem<string>(STORAGE_KEYS.TO)]).then(
      ([from, to]) => setSavedNames({ from: from || DEFAULTS.FROM, to: to || DEFAULTS.TO }),
    );
  }, [saveLastUsed]);

  // Once both the station list and the saved names are known, resolve the initial selection.
  useEffect(() => {
    if (selection !== null || savedNames === null || stations.length === 0) return;
    const resolve = (name: string, fallback: string) =>
      codeByName.get(name) ?? codeByName.get(fallback) ?? stations[0].UICCode;
    setSelection({ from: resolve(savedNames.from, DEFAULTS.FROM), to: resolve(savedNames.to, DEFAULTS.TO) });
  }, [selection, savedNames, stations, codeByName]);

  const reverseStations = useCallback(() => {
    if (!selection) return;
    setSelection({ from: selection.to, to: selection.from });
    setSwapKey((k) => k + 1);
  }, [selection]);

  const searchTrips = useCallback(
    async (val: Form.Values) => {
      const fromCode = val["from"];
      const toCode = val["to"];

      if (saveLastUsed) {
        const fromName = nameByCode.get(fromCode);
        const toName = nameByCode.get(toCode);
        await Promise.all([
          fromName && LocalStorage.setItem(STORAGE_KEYS.FROM, fromName),
          toName && LocalStorage.setItem(STORAGE_KEYS.TO, toName),
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
    [nameByCode, saveLastUsed, push],
  );

  const now = new Date();
  // Render items only once the initial selection is resolved, so defaultValue applies on first mount.
  const visibleStations = selection ? stations : [];

  return (
    <Form
      isLoading={isLoading}
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
        key={`from-${swapKey}-${selection ? "ready" : "loading"}`}
        id="from"
        title="From"
        isLoading={!selection}
        defaultValue={selection?.from}
        stations={visibleStations}
        onChange={(value) => setSelection((s) => (s ? { ...s, from: value } : s))}
      />
      <StationDropdown
        key={`to-${swapKey}-${selection ? "ready" : "loading"}`}
        id="to"
        title="To"
        isLoading={!selection}
        defaultValue={selection?.to}
        stations={visibleStations}
        onChange={(value) => setSelection((s) => (s ? { ...s, to: value } : s))}
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
