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
import { useState } from "react";
import { runEntry } from "./actions";
import { loadLayers, saveLayers, useLayers } from "./data";
import { EntryForm } from "./form-entry";
import { DEFAULT_KEY_COLOR, findEntry } from "./schema";
import { SORT_OPTIONS, sortEntries, type SortOption } from "./sort";
import type { Entry, EntryKind, KeyMode } from "./types";

interface Preferences {
  defaultMode: KeyMode;
}

/** A focused layer: a single key runs its action, and it doubles as the action editor. */
export function LayerView({ layerId }: { layerId: string }) {
  const { layers, isLoading, revalidate } = useLayers();
  const { defaultMode } = getPreferenceValues<Preferences>();
  const [mode, setMode] = useState<KeyMode>(defaultMode ?? "instant");
  const [searchText, setSearchText] = useState("");
  const [sort, setSort] = useState<SortOption>("title-asc");
  const isInstant = mode === "instant";
  const layer = layers.find((l) => l.id === layerId);

  if (!layer) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Loading…"
        searchText={searchText}
        onSearchTextChange={setSearchText}
      />
    );
  }
  const current = layer;

  async function fire(entry: Entry) {
    setSearchText("");
    await closeMainWindow();
    await runEntry(entry);
  }

  function handleChange(text: string) {
    if (!isInstant) {
      setSearchText(text);
      return;
    }
    const visible = text.trim();
    if (visible.length === 0) {
      setSearchText("");
      return;
    }
    if (visible.length > 1) {
      setSearchText("");
      return;
    }
    const entry = findEntry(current.entries, visible);
    if (!entry) {
      setSearchText("");
      showToast({ style: Toast.Style.Failure, title: `No action for "${visible}"` });
      return;
    }
    void fire(entry);
  }

  function toggleMode() {
    const next: KeyMode = isInstant ? "search" : "instant";
    setMode(next);
    setSearchText("");
  }

  return (
    <List
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
      navigationTitle={current.name}
      actions={
        <ActionPanel>
          <Action.Push
            title="Add Action"
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
            target={<EntryForm layerId={current.id} mutate={revalidate} />}
          />
          <Action
            title={isInstant ? "Switch to Search Mode" : "Switch to Instant Mode"}
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={toggleMode}
          />
          <ActionPanel.Section>
            <Action
              title="Delete All Actions"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => deleteAllEntries(current.id, revalidate)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {sortEntries(current.entries, sort).map((entry) => (
        <List.Item
          key={entry.id}
          icon={entry.icon ?? kindIcon(entry.kind)}
          title={entry.title}
          subtitle={entry.value}
          keywords={entry.keywords}
          accessories={[{ tag: { value: entry.key, color: current.color ?? DEFAULT_KEY_COLOR } }]}
          actions={
            <ActionPanel>
              <Action title="Run Action" onAction={() => fire(entry)} />
              <Action.Push
                title="Add Action"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<EntryForm layerId={current.id} mutate={revalidate} />}
              />
              <Action.Push
                title="Edit Action"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={<EntryForm layerId={current.id} existing={entry} mutate={revalidate} />}
              />
              <Action.Push
                title="Duplicate Action"
                icon={Icon.Duplicate}
                shortcut={Keyboard.Shortcut.Common.Duplicate}
                target={
                  <EntryForm
                    layerId={current.id}
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
                  onAction={() => deleteEntry(current.id, entry, revalidate)}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
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
