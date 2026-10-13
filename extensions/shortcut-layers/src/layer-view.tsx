import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  Keyboard,
  List,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { runEntry } from "./actions";
import { loadLayers, saveLayers, useLayers } from "./data";
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

  async function fire(entry: Entry) {
    setSearchText("");
    await closeMainWindow();
    await runEntry(entry);
  }

  function runKey(key: string) {
    setSearchText("");
    if (!layer) return;
    const entry = findEntry(layer.entries, key);
    if (!entry) {
      showToast({ style: Toast.Style.Failure, title: `No action for "${key}"` });
      return;
    }
    void fire(entry);
  }

  function handleChange(text: string) {
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
      isLoading={isLoading}
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
            icon={entry.icon ?? kindIcon(entry.kind)}
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
  const layers = await loadLayers();
  const layer = layers.find((l) => l.id === layerId);
  if (!layer) return;
  layer.entries = layer.entries.filter((e) => e.id !== entry.id);
  await saveLayers(layers);
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
  const layers = await loadLayers();
  const layer = layers.find((l) => l.id === layerId);
  if (!layer) return;
  layer.entries = [];
  await saveLayers(layers);
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
