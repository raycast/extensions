import {
  Action,
  ActionPanel,
  Clipboard,
  getPreferenceValues,
  Grid,
  Icon,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addCustomScope,
  applyStorageDuration,
  chooseFolder,
  enrichWithText,
  formatBytes,
  formatMediaDate,
  loadMediaItems,
  pruneOcrCache,
  readOcrCache,
  readPinnedPaths,
  writeOcrCache,
  writePinnedPaths,
} from "./lib/media";
import type { ScreenshotPreferences } from "./lib/media";
import { filterItems, needsTextSearch, parseSearchQuery } from "./lib/query";

const COLUMN_KEY = "column-count";
const DEFAULT_COLUMNS = 4;
const MIN_COLUMNS = 3;
const MAX_COLUMNS = 6;

type GridActionsProps = {
  columns: number;
  resetColumns: () => void;
  changeColumns: (delta: number) => void;
  addScope: () => Promise<void>;
};

export default function SearchScreenshots() {
  const preferences = useMemo(
    () =>
      getPreferenceValues<ScreenshotPreferences & { columnCount?: string }>(),
    [],
  );
  const [items, setItems] = useState<
    Awaited<ReturnType<typeof loadMediaItems>>
  >([]);
  const [visibleItems, setVisibleItems] = useState<typeof items>([]);
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const ocrCache = useRef<Awaited<ReturnType<typeof readOcrCache>>>({});
  const [columns, setColumns] = useState(
    clampColumns(Number(preferences.columnCount)),
  );
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void LocalStorage.getItem<string>(COLUMN_KEY).then((value) => {
      if (value) setColumns(clampColumns(Number(value)));
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const [scannedItems, nextPinned, nextCache] = await Promise.all([
        loadMediaItems(preferences),
        readPinnedPaths(),
        readOcrCache(),
      ]);
      const nextItems = applyStorageDuration(
        scannedItems,
        preferences.storageDuration,
        nextPinned,
      );
      const prunedCache = pruneOcrCache(
        nextCache,
        preferences.storageDuration,
        nextPinned,
      );
      if (cancelled) return;

      setItems(nextItems);
      setVisibleItems(nextItems);
      setPinned(nextPinned);
      ocrCache.current = prunedCache;
      setIsLoading(false);

      if (prunedCache !== nextCache) await writeOcrCache(prunedCache);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [preferences, refreshKey]);

  useEffect(() => {
    if (isLoading) return;
    const query = parseSearchQuery(searchText);

    if (!needsTextSearch(query) || !preferences.textRecognition) {
      setIsSearching(false);
      setVisibleItems(filterItems(items, query));
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    async function search() {
      const result = await enrichWithText(items, preferences, ocrCache.current);
      if (cancelled) return;

      ocrCache.current = result.cache;
      setVisibleItems(filterItems(result.items, query));
      setIsSearching(false);
      await writeOcrCache(result.cache);
    }

    void search();
    return () => {
      cancelled = true;
    };
  }, [items, isLoading, preferences, searchText]);

  const changeColumns = (delta: number) => {
    setColumns((current) => {
      const next = clampColumns(current + delta);
      void LocalStorage.setItem(COLUMN_KEY, String(next));
      return next;
    });
  };

  const resetColumns = () => {
    const next = clampColumns(Number(preferences.columnCount));
    setColumns(next);
    void LocalStorage.setItem(COLUMN_KEY, String(next));
  };

  const addScope = async () => {
    const folder = await chooseFolder();
    if (!folder) return;
    await addCustomScope(folder);
    await showToast({
      style: Toast.Style.Success,
      title: "Search Scope Added",
      message: folder,
    });
    setRefreshKey((current) => current + 1);
  };

  const gridActions = (
    <GridActions
      columns={columns}
      resetColumns={resetColumns}
      changeColumns={changeColumns}
      addScope={addScope}
    />
  );

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Medium}
      aspectRatio="4/3"
      fit={Grid.Fit.Fill}
      isLoading={isLoading || isSearching}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search screenshots…  name:  text:  date:"
      actions={gridActions}
    >
      {visibleItems.map((item) => (
        <Grid.Item
          key={item.id}
          id={item.id}
          content={item.kind === "image" ? { source: item.path } : Icon.Video}
          title={item.name}
          subtitle={`${formatMediaDate(item.capturedAt)} · ${formatBytes(item.size)}`}
          accessory={
            pinned.has(item.path)
              ? { icon: Icon.Pin, tooltip: "Pinned" }
              : undefined
          }
          quickLook={{ path: item.path }}
          actions={
            <ItemActions
              item={item}
              isPinned={pinned.has(item.path)}
              onTogglePinned={async () => {
                const next = new Set(pinned);
                if (next.has(item.path)) next.delete(item.path);
                else next.add(item.path);
                setPinned(next);
                await writePinnedPaths(next);
              }}
              columns={columns}
              resetColumns={resetColumns}
              changeColumns={changeColumns}
              addScope={addScope}
            />
          }
        />
      ))}
      {!isLoading && visibleItems.length === 0 ? (
        <Grid.EmptyView
          actions={gridActions}
          icon={Icon.MagnifyingGlass}
          title={
            items.length === 0
              ? "No screenshots found"
              : "No matching screenshots"
          }
          description={
            items.length === 0
              ? "Add a folder in Settings or use Add Search Scope from the Action Panel."
              : "Try name:, text:, or date:yesterday."
          }
        />
      ) : null}
    </Grid>
  );
}

function ItemActions({
  item,
  isPinned,
  onTogglePinned,
  columns,
  resetColumns,
  changeColumns,
  addScope,
}: GridActionsProps & {
  item: { path: string; name: string; kind: "image" | "video" };
  isPinned: boolean;
  onTogglePinned: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <Action.ToggleQuickLook />
      <Action
        title={item.kind === "image" ? "Paste Screenshot" : "Paste Recording"}
        icon={Icon.Clipboard}
        onAction={() => pasteFile(item.path, item.name)}
      />
      <Action.CopyToClipboard title="Copy File" content={{ file: item.path }} />
      <Action.Open title="Open" target={item.path} />
      <Action.ShowInFinder path={item.path} />
      <Action
        title={isPinned ? "Unpin Screenshot" : "Pin Screenshot"}
        icon={isPinned ? Icon.PinDisabled : Icon.Pin}
        shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
        onAction={onTogglePinned}
      />
      <ActionPanel.Section title="Grid">
        {columns > MIN_COLUMNS ? (
          <Action
            title={`Use ${columns - 1} Columns`}
            shortcut={{ modifiers: ["cmd"], key: "-" }}
            onAction={() => changeColumns(-1)}
          />
        ) : null}
        {columns < MAX_COLUMNS ? (
          <Action
            title={`Use ${columns + 1} Columns`}
            shortcut={{ modifiers: ["cmd"], key: "+" }}
            onAction={() => changeColumns(1)}
          />
        ) : null}
        <Action
          title="Reset Columns"
          shortcut={{ modifiers: ["cmd"], key: "0" }}
          onAction={resetColumns}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Settings">
        <Action
          title="Add Search Scope"
          icon={Icon.Folder}
          onAction={addScope}
        />
        <Action
          title="Open Screenshot Settings"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function GridActions({
  columns,
  resetColumns,
  changeColumns,
  addScope,
}: GridActionsProps) {
  return (
    <ActionPanel>
      <Action title={`Use ${columns} Columns`} icon={Icon.AppWindowGrid3x3} />
      {columns > MIN_COLUMNS ? (
        <Action
          title={`Use ${columns - 1} Columns`}
          shortcut={{ modifiers: ["cmd"], key: "-" }}
          onAction={() => changeColumns(-1)}
        />
      ) : null}
      {columns < MAX_COLUMNS ? (
        <Action
          title={`Use ${columns + 1} Columns`}
          shortcut={{ modifiers: ["cmd"], key: "+" }}
          onAction={() => changeColumns(1)}
        />
      ) : null}
      <Action
        title="Reset Columns"
        shortcut={{ modifiers: ["cmd"], key: "0" }}
        onAction={resetColumns}
      />
      <Action title="Add Search Scope" icon={Icon.Folder} onAction={addScope} />
      <Action
        title="Open Screenshot Settings"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );
}

async function pasteFile(filePath: string, name: string): Promise<void> {
  try {
    await Clipboard.paste({ file: filePath });
    await showToast({
      style: Toast.Style.Success,
      title: "Pasted",
      message: name,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Paste File",
      message:
        error instanceof Error ? error.message : "The file could not be pasted",
    });
  }
}

function clampColumns(value: number): number {
  return Number.isFinite(value)
    ? Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, value))
    : DEFAULT_COLUMNS;
}
