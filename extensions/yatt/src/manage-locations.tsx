import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Color,
  confirmAlert,
  environment,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
  Keyboard,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseHourRange } from "./core/business";
import { searchDataset, type SearchResult } from "./core/dataset";
import { formatTime } from "./core/format";
import { moveItem, normalizeLocations, parseLocationsFile } from "./core/store";
import { zoneAbbreviation } from "./core/time";
import type { Location } from "./core/types";
import { loadDataset, loadSeed, loadZones, zoneInfo } from "./lib/data";
import { searchOnline } from "./lib/nominatim";
import { getPrefs } from "./lib/prefs";
import { currentBackend, useLocations } from "./lib/storage";
import { flag, locationSubtitle } from "./lib/ui";

export default function ManageLocations() {
  const prefs = useMemo(getPrefs, []);
  const { locations, isLoading, save, error } = useLocations();
  const { push } = useNavigation();
  const list = locations ?? [];
  const storage = useMemo(currentBackend, []);
  const now = Date.now();

  useEffect(() => {
    if (error) void showToast({ style: Toast.Style.Failure, title: "Could not load locations", message: error });
  }, [error]);

  /**
   * Applies a change to the list as it is on disk at that moment, not to the copy this view loaded, so edits
   * made meanwhile from another command or another Mac survive. Returns the menu bar's refresh error, if any.
   * Save failures are already shown by the store.
   */
  const update = async (change: (current: Location[]) => Location[], message?: string): Promise<string | undefined> => {
    try {
      const menuBarError = await save((f) => ({ locations: normalizeLocations(change(f.locations)) }));
      if (message) await showToast({ style: Toast.Style.Success, title: message });
      return menuBarError;
    } catch {
      return undefined;
    }
  };

  const openAdd = () =>
    push(
      <AddLocation
        existing={list}
        onAdd={async (l, home) => {
          const makeHome = home || l.isHome === true;
          await update((current) => {
            const next = makeHome ? current.map((x) => ({ ...x, isHome: false })) : [...current];
            const at = next.findIndex((x) => x.id === l.id);
            if (at === -1) next.push({ ...l, isHome: makeHome || undefined });
            else if (makeHome) next[at] = { ...next[at], isHome: true };
            return next;
          }, `Added ${l.label}`);
        }}
      />,
    );

  const exportJson = async () => {
    await Clipboard.copy(JSON.stringify({ version: 1, locations: list }, null, 2));
    await showToast({ style: Toast.Style.Success, title: "Copied locations as JSON" });
  };

  const importJson = async () => {
    const text = (await Clipboard.readText()) ?? "";
    const parsed = parseLocationsFile(text);
    if (!parsed) {
      await showToast({ style: Toast.Style.Failure, title: "Clipboard does not contain a locations JSON" });
      return;
    }
    const ok = await confirmAlert({
      title: `Replace ${list.length} locations with ${parsed.locations.length} from the clipboard?`,
      primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
    });
    if (ok) await update(() => parsed.locations, "Imported locations");
  };

  const resetSeed = async () => {
    const ok = await confirmAlert({
      title: "Reset to the default locations?",
      message: "Your current list will be replaced.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (ok) await update(() => loadSeed(), "Reset to defaults");
  };

  const commonActions = (
    <ActionPanel.Section title="List">
      <Action title="Add Location" icon={Icon.Plus} shortcut={Keyboard.Shortcut.Common.New} onAction={openAdd} />
      <Action title="Export as JSON to Clipboard" icon={Icon.Download} onAction={exportJson} />
      <Action title="Import JSON from Clipboard" icon={Icon.Upload} onAction={importJson} />
      {storage.file && <Action.ShowInFinder title="Reveal Locations File" icon={Icon.Finder} path={storage.file} />}
      <Action
        title="Reset to Defaults"
        icon={Icon.RotateAntiClockwise}
        style={Action.Style.Destructive}
        onAction={resetSeed}
      />
      <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.Open
        title="Data Sources and Licences"
        icon={Icon.Document}
        target={path.join(environment.assetsPath, "NOTICE.md")}
      />
    </ActionPanel.Section>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter your locations…">
      <List.Section
        title={`${list.length} location${list.length === 1 ? "" : "s"}`}
        subtitle={storage.file ? `file: ${storage.file}` : "stored in Raycast on this Mac"}
      >
        {list.map((l) => (
          <List.Item
            key={l.id}
            icon={
              l.isHome ? { source: Icon.House, tintColor: Color.Orange } : l.kind === "zone" ? Icon.Globe : Icon.Pin
            }
            title={l.label}
            subtitle={`${flag(l.country)} ${locationSubtitle(l)}`.trim()}
            keywords={[l.tz, ...l.aliases]}
            accessories={[
              ...(l.menuBar?.show ? [{ icon: Icon.AppWindow, tooltip: "Shown in the menu bar" }] : []),
              ...(l.aliases.length
                ? [{ tag: l.aliases.map((a) => a.toUpperCase()).join(" "), tooltip: "Aliases" }]
                : []),
              { tag: zoneAbbreviation(now, l.tz, zoneInfo(l.tz)?.abbr), tooltip: l.tz },
              { text: formatTime(now, l.tz, prefs.timeFormat) },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="Edit…"
                    icon={Icon.Pencil}
                    onAction={() =>
                      push(
                        <EditLocation
                          location={l}
                          onSave={(edited) =>
                            update(
                              (current) =>
                                current.map((x) =>
                                  x.id === l.id ? edited : edited.isHome ? { ...x, isHome: false } : x,
                                ),
                              "Saved",
                            )
                          }
                        />,
                      )
                    }
                  />
                  <Action
                    title={l.isHome ? "Unset Home" : "Set as Home"}
                    icon={Icon.House}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
                    onAction={() =>
                      update((current) => current.map((x) => ({ ...x, isHome: x.id === l.id ? !x.isHome : false })))
                    }
                  />
                  <Action
                    title={l.menuBar?.show ? "Hide from Menu Bar" : "Show in Menu Bar"}
                    icon={Icon.AppWindow}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                    onAction={async () => {
                      const error = await update((current) =>
                        current.map((x) =>
                          x.id === l.id ? { ...x, menuBar: { ...x.menuBar, show: !x.menuBar?.show } } : x,
                        ),
                      );
                      if (error) {
                        await showToast({
                          style: Toast.Style.Failure,
                          title: "Menu Bar Clock is not running",
                          message: `Run it once from the root search to place it in the menu bar. (${error})`,
                        });
                      }
                    }}
                  />
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                    onAction={() =>
                      update((current) => {
                        const from = current.findIndex((x) => x.id === l.id);
                        return moveItem(current, from, from - 1);
                      })
                    }
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    onAction={() =>
                      update((current) => {
                        const from = current.findIndex((x) => x.id === l.id);
                        return moveItem(current, from, from + 1);
                      })
                    }
                  />
                  <Action
                    title="Remove"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => update((current) => current.filter((x) => x.id !== l.id), `Removed ${l.label}`)}
                  />
                </ActionPanel.Section>
                {commonActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && list.length === 0 && (
        <List.EmptyView
          title="No locations"
          description="Press ⌘N to add a city or time zone"
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      )}
    </List>
  );
}

// ------------------------------------------------------------------ Add

function AddLocation(props: { existing: Location[]; onAdd: (l: Location, home: boolean) => Promise<void> }) {
  const prefs = useMemo(getPrefs, []);
  const { pop, push } = useNavigation();
  const [query, setQuery] = useState("");
  const [ds, setDs] = useState<ReturnType<typeof loadDataset>>();
  const [online, setOnline] = useState<{ query: string; results: Location[]; loading: boolean; error?: string }>();
  const existingIds = useMemo(() => new Set(props.existing.map((l) => l.id)), [props.existing]);

  useEffect(() => {
    // Defer the 9 MB parse so the view appears immediately.
    const t = setTimeout(() => {
      try {
        setDs(loadDataset());
      } catch (e) {
        void showToast({ style: Toast.Style.Failure, title: "Could not load the place data", message: String(e) });
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const results: SearchResult = useMemo(
    () => (ds ? searchDataset(ds, query) : { cities: [], places: [], zones: [] }),
    [ds, query],
  );
  const nothingLocal = ds && !results.cities.length && !results.places.length && !results.zones.length;

  // One request in flight at a time; a new query or leaving the view aborts the previous one.
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const runOnline = (q: string) => {
    if (!q.trim()) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setOnline({ query: q, results: [], loading: true });
    searchOnline(q, controller.signal)
      .then((r) => {
        if (!controller.signal.aborted) setOnline({ query: q, results: r, loading: false });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setOnline({ query: q, results: [], loading: false, error: e instanceof Error ? e.message : String(e) });
      });
  };
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (!prefs.onlineLookup || !nothingLocal || query.trim().length < 4) return;
    const t = setTimeout(() => runOnline(query), 1100);
    return () => clearTimeout(t);
  }, [query, nothingLocal, prefs.onlineLookup]);

  const add =
    (l: Location, home = false) =>
    async () => {
      if (existingIds.has(l.id)) {
        await showToast({ style: Toast.Style.Failure, title: `${l.label} is already in your list` });
        return;
      }
      await props.onAdd(l, home);
      pop();
    };

  const item = (l: Location, extraSubtitle?: string) => {
    const added = existingIds.has(l.id);
    return (
      <List.Item
        key={l.id}
        icon={l.kind === "zone" ? Icon.Globe : Icon.Pin}
        title={l.label}
        subtitle={`${flag(l.country)} ${extraSubtitle ?? locationSubtitle(l)}`.trim()}
        accessories={[
          ...(added ? [{ tag: { value: "added", color: Color.Green } }] : []),
          ...(l.aliases.length && l.kind === "city" ? [{ tag: l.aliases.map((a) => a.toUpperCase()).join(" ") }] : []),
          { tag: l.tz },
          { text: formatTime(Date.now(), l.tz, prefs.timeFormat) },
        ]}
        actions={
          <ActionPanel>
            <Action title={added ? "Already Added" : "Add"} icon={Icon.Plus} onAction={add(l)} />
            <Action title="Add and Set as Home" icon={Icon.House} onAction={add(l, true)} />
            <ActionPanel.Section>
              <Action
                title="Custom Place…"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() => push(<EditLocation onSave={(x) => props.onAdd(x, false).then(pop)} />)}
              />
              {prefs.onlineLookup && (
                <Action
                  title={`Search OpenStreetMap for “${query}”`}
                  icon={Icon.Globe}
                  onAction={() => runOnline(query)}
                />
              )}
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  const emptyActions = (
    <ActionPanel>
      <Action
        title="Custom Place…"
        icon={Icon.Pencil}
        onAction={() => push(<EditLocation onSave={(x) => props.onAdd(x, false).then(pop)} />)}
      />
      {prefs.onlineLookup && query.trim() && (
        <Action title={`Search OpenStreetMap for “${query}”`} icon={Icon.Globe} onAction={() => runOnline(query)} />
      )}
    </ActionPanel>
  );

  return (
    <List
      isLoading={!ds || online?.loading}
      filtering={false}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="City (Zürich), code (ZRH, JFK) or time zone (CEST, Europe/Berlin)…"
    >
      {results.cities.length > 0 && (
        <List.Section title="Cities">{results.cities.map((h) => item(h.location))}</List.Section>
      )}
      {results.zones.length > 0 && (
        <List.Section title="Time Zones">
          {results.zones.map((h) => item(h.location, h.row.name === h.row.long ? "" : h.row.name))}
        </List.Section>
      )}
      {results.places.length > 0 && (
        <List.Section title="More Places (UN/LOCODE)">{results.places.map((h) => item(h.location))}</List.Section>
      )}
      {online && online.query === query && online.results.length > 0 && (
        <List.Section title="OpenStreetMap">{online.results.map((l) => item(l))}</List.Section>
      )}
      {ds && query.trim() === "" && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type a city, a code or a time zone"
          description="e.g. Hallstatt · ZRH · JFK · Pacific Time · UTC"
          actions={emptyActions}
        />
      )}
      {ds && query.trim() !== "" && nothingLocal && !online?.results.length && (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title={
            online?.loading ? "Searching OpenStreetMap…" : online?.error ? online.error : "Not in the bundled dataset"
          }
          description="Add it as a custom place (name + time zone) or search OpenStreetMap"
          actions={emptyActions}
        />
      )}
    </List>
  );
}

// ------------------------------------------------------------------ Edit / custom

function EditLocation(props: { location?: Location; onSave: (l: Location) => Promise<unknown> | void }) {
  const zones = useMemo(loadZones, []);
  const { pop } = useNavigation();
  const l = props.location;
  const [tz, setTz] = useState(l?.tz ?? "UTC");
  const [hoursError, setHoursError] = useState<string>();

  return (
    <Form
      navigationTitle={l ? `Edit ${l.label}` : "Custom Place"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (v: {
              label: string;
              aliases: string;
              tz: string;
              isHome: boolean;
              hours: string;
              menuBar: boolean;
              menuBarFormat: string;
            }) => {
              const hours = v.hours.trim() ? parseHourRange(v.hours) : undefined;
              if (v.hours.trim() && !hours) {
                setHoursError("Use start-end, e.g. 9-18");
                return;
              }
              const next: Location = {
                ...(l ?? { id: `custom:${Date.now().toString(36)}`, kind: "city", aliases: [] }),
                label: v.label.trim() || v.tz,
                tz: v.tz,
                aliases: v.aliases
                  .split(/[,\s]+/)
                  .map((a) => a.trim().toLowerCase())
                  .filter(Boolean),
                isHome: v.isHome || undefined,
                businessHours: hours,
                menuBar:
                  v.menuBar || v.menuBarFormat.trim()
                    ? { show: v.menuBar, format: v.menuBarFormat.trim() || undefined }
                    : undefined,
              };
              await props.onSave(next);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="label" title="Name" defaultValue={l?.label ?? ""} placeholder="Hallstatt" />
      <Form.Dropdown id="tz" title="Time Zone" value={tz} onChange={setTz}>
        {zones.map((z) => (
          <Form.Dropdown.Item
            key={z.name}
            value={z.name}
            title={z.name === z.long ? z.name : `${z.name} · ${z.long}`}
            keywords={[...z.abbr, ...z.cities]}
          />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="aliases"
        title="Aliases"
        defaultValue={l?.aliases.join(", ") ?? ""}
        placeholder="zrh, zurich"
        info="Comma-separated. Typed in Convert Time to pick this location as the anchor."
      />
      <Form.TextField
        id="hours"
        title="Business Hours"
        defaultValue={l?.businessHours ? `${l.businessHours.start}-${l.businessHours.end}` : ""}
        placeholder="9-18 (leave empty for the global preference)"
        error={hoursError}
        onChange={() => setHoursError(undefined)}
      />
      <Form.Checkbox id="isHome" label="Home location" defaultValue={l?.isHome ?? false} />
      <Form.Separator />
      <Form.Checkbox
        id="menuBar"
        title="Menu Bar"
        label="Show in the menu bar"
        defaultValue={l?.menuBar?.show ?? false}
      />
      <Form.TextField
        id="menuBarFormat"
        title="Menu Bar Format"
        defaultValue={l?.menuBar?.format ?? ""}
        placeholder="{code} {time} (leave empty for the global preference)"
      />
    </Form>
  );
}
