import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { homedir } from "os";
import { isAbsolute, join } from "path";
import { useEffect, useRef, useState } from "react";
import { runEntry } from "./actions";
import { updateLayer, useLayers } from "./data";
import { EntryForm } from "./form-entry";
import { DEFAULT_KEY_COLOR, findEntry } from "./schema";
import { SORT_OPTIONS, sortEntries, type SortOption } from "./sort";
import type { Entry, EntryKind, KeyMode } from "./types";

/** A focused layer: a single key runs its action, and it doubles as the action editor. */
export function LayerView({ layerId }: { layerId: string }) {
  const { layers, isLoading, revalidate } = useLayers();
  const { defaultMode } = getPreferenceValues<Preferences>();
  const [mode, setMode] = useState<KeyMode>(defaultMode ?? "instant");
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<SortOption>("title-asc");
  const layer = layers.find((l) => l.id === layerId);
  const isInstant = mode === "instant";
  // A key pressed before the layer finished loading, replayed once it arrives.
  const pending = useRef<string | null>(null);
  // Set while an action is firing, so a second keypress cannot start it again.
  const firing = useRef(false);
  // Title of the shell action that is running, for the spinner and toast.
  const [running, setRunning] = useState<string | null>(null);

  async function fire(entry: Entry) {
    if (firing.current) return;
    firing.current = true;
    setSearchText("");

    const isShell = entry.kind === "shell";
    setRunning(isShell ? entry.title : null);
    const toast = isShell
      ? await showToast({ style: Toast.Style.Animated, title: `Running "${entry.title}"…` })
      : undefined;

    const { ok, error } = await runEntry(entry);
    setRunning(null);

    if (!ok) {
      // Keep the panel open so the failure is readable; the user closes it. A
      // toast created right before the window closes is dropped, so closing here
      // would hide the very message we want to show.
      firing.current = false;
      if (toast) {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed: ${entry.title}`;
        toast.message = error;
      } else {
        await showToast({ style: Toast.Style.Failure, title: `Failed: ${entry.title}`, message: error });
      }
      return;
    }

    // Success: drop the running toast before closing, so it cannot resurface as a
    // stale system notification.
    if (toast) await toast.hide();

    // The action has to finish before the panel closes: closing first suspends
    // this code, so a shell command would never start. Running first also keeps
    // the popped root search from stealing focus back from the target app.
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

    if (isShell) await showHUD(`Done: ${entry.title}`);
  }

  function runKey(key: string) {
    setSearchText("");
    if (!layer || firing.current) return;
    const entry = findEntry(layer.entries, key);
    if (!entry) {
      showToast({ style: Toast.Style.Failure, title: `No action for "${key}"` });
      return;
    }
    void fire(entry);
  }

  function handleChange(text: string) {
    if (firing.current) return;
    if (!isInstant) {
      setSearchText(text);
      return;
    }
    const visible = text.trim();
    if ([...visible].length !== 1) {
      setSearchText("");
      return;
    }
    if (!layer) {
      pending.current = visible;
      setSearchText("");
      return;
    }
    runKey(visible);
  }

  useEffect(() => {
    if (!layer || !pending.current) return;
    const key = pending.current;
    pending.current = null;
    runKey(key);
  }, [layer, runKey]);

  function toggleMode() {
    const next: KeyMode = isInstant ? "search" : "instant";
    setMode(next);
    setSearchText("");
  }

  // Shown both when nothing is selected and in every item's panel, since a
  // selection hides the list-level panel.
  const sharedActions = layer && (
    <>
      <Action
        title={isInstant ? "Switch to Search Mode" : "Switch to Instant Mode"}
        icon={Icon.MagnifyingGlass}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={toggleMode}
      />
      <Action
        title="Delete All Actions"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => deleteAllEntries(layer.id, revalidate)}
      />
    </>
  );

  return (
    <List
      isLoading={isLoading || running !== null}
      filtering={!isInstant}
      searchText={searchText}
      onSearchTextChange={handleChange}
      searchBarPlaceholder={isInstant ? "Press a key…" : "Search actions…"}
      searchBarAccessory={
        <List.Dropdown tooltip="Sort actions" value={sort} onChange={(value) => setSort(value as SortOption)}>
          {SORT_OPTIONS.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
      navigationTitle={layer?.name}
      actions={
        <ActionPanel>
          {layer && (
            <Action.Push
              title="Add Action"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<EntryForm layerId={layer.id} mutate={revalidate} />}
            />
          )}
          {sharedActions && <ActionPanel.Section>{sharedActions}</ActionPanel.Section>}
        </ActionPanel>
      }
    >
      {layer &&
        sortEntries(layer.entries, sort).map((entry) => (
          <List.Item
            key={entry.id}
            icon={entryIcon(entry)}
            title={entry.title}
            subtitle={entry.value}
            keywords={entry.keywords}
            accessories={[{ tag: { value: entry.key, color: layer.color ?? DEFAULT_KEY_COLOR } }]}
            actions={
              <ActionPanel>
                <Action title="Run Action" onAction={() => fire(entry)} />
                <Action.Push
                  title="Add Action"
                  icon={Icon.Plus}
                  shortcut={Keyboard.Shortcut.Common.New}
                  target={<EntryForm layerId={layer.id} mutate={revalidate} />}
                />
                <Action.Push
                  title="Edit Action"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<EntryForm layerId={layer.id} existing={entry} mutate={revalidate} />}
                />
                <Action.Push
                  title="Duplicate Action"
                  icon={Icon.Duplicate}
                  shortcut={Keyboard.Shortcut.Common.Duplicate}
                  target={
                    <EntryForm
                      layerId={layer.id}
                      initial={{ ...entry, title: `${entry.title} copy` }}
                      title="Duplicate Action"
                      mutate={revalidate}
                    />
                  }
                />
                <ActionPanel.Section>
                  <Action.CopyToClipboard title="Copy Target" content={entry.value} />
                  <Action
                    title="Delete Action"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteEntry(layer.id, entry, revalidate)}
                  />
                </ActionPanel.Section>
                {sharedActions && <ActionPanel.Section>{sharedActions}</ActionPanel.Section>}
              </ActionPanel>
            }
          />
        ))}

      {!isLoading && !layer && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Layer not found"
          description={`No layer with id "${layerId}". Its Quicklink may be out of date.`}
        />
      )}
    </List>
  );
}

async function deleteEntry(layerId: string, entry: Entry, mutate: () => void) {
  const confirmed = await confirmAlert({
    title: `Delete "${entry.title}"?`,
    message: "This cannot be undone.",
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
  });
  if (!confirmed) return;
  await updateLayer(layerId, (layer) => {
    layer.entries = layer.entries.filter((e) => e.id !== entry.id);
  });
  mutate();
  showToast({ style: Toast.Style.Success, title: "Action deleted" });
}

async function deleteAllEntries(layerId: string, mutate: () => void) {
  const confirmed = await confirmAlert({
    title: "Delete all actions?",
    message: "This cannot be undone.",
    primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete All" },
  });
  if (!confirmed) return;
  await updateLayer(layerId, (layer) => {
    layer.entries = [];
  });
  mutate();
  showToast({ style: Toast.Style.Success, title: "All actions deleted" });
}

function kindIcon(kind: EntryKind): Icon {
  switch (kind) {
    case "app":
      return Icon.AppWindow;
    case "file":
      return Icon.Document;
    case "shell":
      return Icon.Terminal;
    default:
      return Icon.Globe;
  }
}

/** Absolute local path for an app bundle or file entry, or undefined if not a path. */
function localIconPath(value: string): string | undefined {
  const path = value.startsWith("~/") ? join(homedir(), value.slice(2)) : value;
  return isAbsolute(path) ? path : undefined;
}

/** Real icon for app and file entries; falls back to the kind's glyph. */
function entryIcon(entry: Entry): string | { fileIcon: string } {
  if (entry.kind === "app" || entry.kind === "file") {
    const path = localIconPath(entry.value);
    if (path) return { fileIcon: path };
  }
  return kindIcon(entry.kind);
}
