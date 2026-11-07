// Configure view (SPEC.md §12 M3): Pinned, then Tracked, then Utilities (§9), then Available. Move Up/Down within the
// tracked order (the order used by Pinned + Badged and Badged Only), Pin/Unpin, Add, Remove. The Trash has its own pin
// and no place in the tracked order. Adapted from the badge project's
// configure-apps.tsx; storage goes through src/storage.ts so the §5.3 first-run rules and key names apply.
import { Action, ActionPanel, Color, getApplications, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { addApp, availableApps, moveApp, removeApp, type InstalledApp, type SelectedApp } from "./lib/badge/config.ts";
import { prunePins, togglePin } from "./lib/badge/views.ts";
import { toggleUtilityPin, TRASH_ITEM_ID, type UtilityId } from "./lib/utilities.ts";
import { loadAppsAndPins, saveApps, savePins, saveUtilityPins, showConfigNotices } from "./storage.ts";

// Same icon slot as the main list (app-list.tsx): the pin comes last, in a square 16 px image (Icon.Pin measures
// 12 px), and unpinned rows keep the slot with a blank, so the pins and the `#N` text line up on every row.
const PIN_ACCESSORY: List.Item.Accessory = {
  icon: { source: "pin.png", tintColor: Color.SecondaryText },
  tooltip: "Pinned: always shown in All Apps and Pinned + Badged",
};
const TRASH_PIN_ACCESSORY: List.Item.Accessory = {
  icon: { source: "pin.png", tintColor: Color.SecondaryText },
  tooltip: "Pinned: shown at the end of All Apps and Pinned + Badged",
};
const BLANK_ICON: List.Item.Accessory = { icon: "blank.png" };

export function ConfigureApps() {
  const [selected, setSelected] = useState<SelectedApp[]>();
  const [installed, setInstalled] = useState<InstalledApp[]>();
  const [pins, setPins] = useState<string[]>([]);
  const [utilityPins, setUtilityPins] = useState<UtilityId[]>([]);
  /** Set when loading fails; nothing is editable then, so no save can overwrite the stored lists with empty ones. */
  const [loadError, setLoadError] = useState<string>();
  const started = useRef(false);
  // Latest selection and pins, so quick successive actions each build on the previous one.
  const latest = useRef<SelectedApp[]>([]);
  const latestPins = useRef<string[]>([]);
  const latestUtilityPins = useRef<UtilityId[]>([]);

  async function load() {
    setLoadError(undefined);
    try {
      const [loaded, apps] = await Promise.all([loadAppsAndPins(), getApplications()]);
      latest.current = loaded.apps;
      latestPins.current = loaded.pins;
      latestUtilityPins.current = loaded.utilityPins;
      setPins(loaded.pins);
      setUtilityPins(loaded.utilityPins);
      setSelected(loaded.apps);
      setInstalled(apps);
      await showConfigNotices({ appsNotice: loaded.appsNotice });
    } catch (error) {
      setLoadError(String(error));
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, []);

  async function change(update: (apps: SelectedApp[]) => SelectedApp[]) {
    const next = update(latest.current);
    latest.current = next;
    setSelected(next);
    try {
      await saveApps(next);
      // A removed app loses its pin in the same save (pins ⊆ apps), so re-adding it gives an unpinned app.
      const pruned = prunePins(latestPins.current, next);
      if (pruned.length !== latestPins.current.length) {
        latestPins.current = pruned;
        setPins(pruned);
        await savePins(pruned);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save the app selection",
        message: String(error),
      });
    }
  }

  async function changePin(bundleId: string) {
    const next = togglePin(latestPins.current, bundleId);
    latestPins.current = next;
    setPins(next);
    try {
      await savePins(next);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save pins", message: String(error) });
    }
  }

  async function changeUtilityPin(id: UtilityId) {
    const next = toggleUtilityPin(latestUtilityPins.current, id);
    latestUtilityPins.current = next;
    setUtilityPins(next);
    try {
      await saveUtilityPins(next);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save pins", message: String(error) });
    }
  }

  const tracked = selected ?? [];
  const trashPinned = utilityPins.includes("trash");
  const available = availableApps(installed ?? [], tracked);
  const pinned = tracked.filter((app) => pins.includes(app.bundleId));
  const unpinned = tracked.filter((app) => !pins.includes(app.bundleId));

  const trackedItem = (app: SelectedApp) => {
    const index = tracked.findIndex((entry) => entry.bundleId === app.bundleId);
    const isPinned = pins.includes(app.bundleId);
    return (
      <List.Item
        key={app.bundleId}
        id={app.bundleId}
        icon={{ fileIcon: app.path }}
        title={app.name}
        keywords={[app.bundleId]}
        accessories={[
          { text: `#${index + 1}`, tooltip: "Position in the badge tracking order (Pinned + Badged and Badged Only)" },
          isPinned ? PIN_ACCESSORY : BLANK_ICON,
        ]}
        actions={
          <ActionPanel>
            <Action
              title={isPinned ? "Unpin" : "Pin"}
              icon={isPinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => changePin(app.bundleId)}
            />
            <Action
              title="Move up"
              icon={Icon.ArrowUp}
              shortcut={Keyboard.Shortcut.Common.MoveUp}
              onAction={() => change((apps) => moveApp(apps, app.bundleId, "up"))}
            />
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={Keyboard.Shortcut.Common.MoveDown}
              onAction={() => change((apps) => moveApp(apps, app.bundleId, "down"))}
            />
            <Action
              title="Remove"
              icon={Icon.Minus}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => change((apps) => removeApp(apps, app.bundleId))}
            />
          </ActionPanel>
        }
      />
    );
  };

  if (loadError && (selected === undefined || installed === undefined)) {
    return (
      <List navigationTitle="Manage Pinned Apps">
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
          title="Could not load your apps and pins"
          description={loadError}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void load()} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Manage Pinned Apps"
      isLoading={selected === undefined || installed === undefined}
      searchBarPlaceholder="Filter apps"
    >
      <List.Section title="Pinned" subtitle={`${pinned.length} · badge tracking, always listed`}>
        {pinned.map(trackedItem)}
      </List.Section>
      <List.Section title="Badge Tracking" subtitle={`${unpinned.length} · listed only with a window or a badge`}>
        {unpinned.map(trackedItem)}
      </List.Section>
      <List.Section title="Utilities">
        <List.Item
          id={TRASH_ITEM_ID}
          icon={Icon.Trash}
          title="Trash"
          subtitle="Open Trash and Empty Trash from the list"
          keywords={["empty", "bin"]}
          accessories={[trashPinned ? TRASH_PIN_ACCESSORY : BLANK_ICON]}
          actions={
            <ActionPanel>
              <Action
                title={trashPinned ? "Unpin" : "Pin"}
                icon={trashPinned ? Icon.PinDisabled : Icon.Pin}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() => changeUtilityPin("trash")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Available" subtitle={`${available.length} · no badge tracking, listed only with a window`}>
        {available.map((app) => (
          <List.Item
            key={app.bundleId}
            id={app.bundleId}
            icon={{ fileIcon: app.path }}
            title={app.name}
            keywords={[app.bundleId]}
            actions={
              <ActionPanel>
                <Action title="Add" icon={Icon.Plus} onAction={() => change((apps) => addApp(apps, app))} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

export default function Command() {
  return <ConfigureApps />;
}
