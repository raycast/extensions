import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { promises as fs } from "node:fs";
import { useEffect, useMemo, useState } from "react";
import ImportGifs from "./import-gifs";
import { discoverGifFolders } from "./importer";
import { fetchKlipyGifs } from "./klipy";
import { localPreviewSource } from "./local-preview";
import { optimizedFileFor, originalFileFor } from "./optimizer";
import {
  addRecent,
  clearRecents,
  getFavorites,
  getLocalFolders,
  getLocalGifs,
  getRecents,
  removeLocalGif,
  removeLocalFolder,
  toggleFavorite,
} from "./storage";
import type { GifItem } from "./types";

type View = "all" | "search" | "favorites" | "recents" | "local";

interface GifSection {
  key: string;
  title: string;
  items: GifItem[];
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function originalSize(item: GifItem) {
  return (
    item.originalSize ??
    item.renditions?.find((rendition) => rendition.url === item.originalUrl)
      ?.size
  );
}

function subtitle(item: GifItem) {
  const size = originalSize(item);
  const description =
    item.description ?? (item.source === "local" ? "Local" : undefined);
  return [size ? formatBytes(size) : undefined, description]
    .filter(Boolean)
    .join(" • ");
}

export default function SearchGifs() {
  const preferences = getPreferenceValues<Preferences.SearchGifs>();
  const [view, setView] = useState<View>("all");
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<GifItem[]>([]);
  const [favorites, setFavorites] = useState<GifItem[]>([]);
  const [recents, setRecents] = useState<GifItem[]>([]);
  const [local, setLocal] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function reloadLibrary() {
    setLibraryLoading(true);
    try {
      const [nextFavorites, nextRecents, managedLocal, folders] =
        await Promise.all([
          getFavorites(),
          getRecents(),
          getLocalGifs(),
          getLocalFolders(),
        ]);
      const [linkedLocal, localWithSizes] = await Promise.all([
        discoverGifFolders(folders),
        Promise.all(
          managedLocal.map(async (item) => {
            if (item.originalSize || !item.localPath) return item;
            const file = await fs.stat(item.localPath).catch(() => undefined);
            return file ? { ...item, originalSize: file.size } : item;
          }),
        ),
      ]);
      setFavorites(nextFavorites);
      setRecents(nextRecents);
      setLocal([...linkedLocal, ...localWithSizes]);
      return true;
    } catch (cause) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh GIF folders",
        message: cause instanceof Error ? cause.message : String(cause),
      });
      return false;
    } finally {
      setLibraryLoading(false);
    }
  }

  useEffect(() => {
    void reloadLibrary();
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => setQuery(searchText), 300);
    return () => clearTimeout(timeout);
  }, [searchText]);
  useEffect(() => {
    if (view !== "all" && view !== "search") return;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    fetchKlipyGifs(query, preferences, controller.signal)
      .then(setRemote)
      .catch((cause: unknown) => {
        if (cause instanceof Error && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : String(cause));
        setRemote([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, view]);

  const matchesSearch = (item: GifItem) => {
    const needle = searchText.trim().toLowerCase();
    return (
      !needle ||
      item.title.toLowerCase().includes(needle) ||
      item.description?.toLowerCase().includes(needle)
    );
  };

  const visible = useMemo(() => {
    const items =
      view === "search"
        ? remote
        : view === "favorites"
          ? favorites
          : view === "recents"
            ? recents
            : local;
    return items.filter(matchesSearch);
  }, [view, remote, favorites, recents, local, searchText]);

  const allSections = useMemo<GifSection[]>(() => {
    if (view !== "all") return [];
    const recentOrder = new Map(
      recents.map((item, index) => [item.id, index] as const),
    );
    const favoriteIds = new Set(favorites.map((item) => item.id));
    const sortedFavorites = [...favorites]
      .sort(
        (left, right) =>
          (recentOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (recentOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      )
      .filter(matchesSearch);
    const recentItems = recents
      .filter((item) => !favoriteIds.has(item.id))
      .filter(matchesSearch);
    const shownIds = new Set([
      ...sortedFavorites.map((item) => item.id),
      ...recentItems.map((item) => item.id),
    ]);
    const localItems = local
      .filter((item) => !shownIds.has(item.id))
      .filter(matchesSearch);
    for (const item of localItems) shownIds.add(item.id);
    const remoteItems = remote
      .filter((item) => !shownIds.has(item.id))
      .filter(matchesSearch);
    return [
      {
        key: "favorites",
        title: "Favorites — Recently Used First",
        items: sortedFavorites,
      },
      { key: "recents", title: "Last Used", items: recentItems },
      { key: "local", title: "Local GIFs", items: localItems },
      {
        key: "klipy",
        title: query.trim() ? "KLIPY Search" : "KLIPY Trending",
        items: remoteItems,
      },
    ].filter((section) => section.items.length > 0);
  }, [view, favorites, recents, local, remote, searchText, query]);
  const favoriteIds = useMemo(
    () => new Set(favorites.map((item) => item.id)),
    [favorites],
  );

  async function copy(item: GifItem) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Optimizing GIF…",
    });
    try {
      const maxBytes =
        Math.max(0.25, Number(preferences.maxSizeMB) || 2) * 1024 * 1024;
      const thresholdBytes =
        Math.max(1, Number(preferences.optimizeThresholdKB) || 500) * 1024;
      const maxDimension = Math.max(
        64,
        Number(preferences.maxDimension) || 720,
      );
      const result = await optimizedFileFor(item, {
        maxBytes,
        maxDimension,
        thresholdBytes,
      });
      await Clipboard.copy({ file: result.path });
      await addRecent(item);
      setRecents(await getRecents());
      toast.style = Toast.Style.Success;
      toast.title = "Copied optimized GIF";
      toast.message = formatBytes(result.bytes);
      await closeMainWindow();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not copy GIF";
      toast.message = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function copyOriginal(item: GifItem) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Copying original GIF…",
    });
    try {
      const result = await originalFileFor(item);
      await Clipboard.copy({ file: result.path });
      await addRecent(item);
      setRecents(await getRecents());
      toast.style = Toast.Style.Success;
      toast.title = "Copied original GIF";
      toast.message = formatBytes(result.bytes);
      await closeMainWindow();
    } catch (cause) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not copy original GIF";
      toast.message = cause instanceof Error ? cause.message : String(cause);
    }
  }

  async function favorite(item: GifItem) {
    const added = await toggleFavorite(item);
    setFavorites(await getFavorites());
    await showToast({
      style: Toast.Style.Success,
      title: added ? "Added to Favorites" : "Removed from Favorites",
    });
  }

  async function clearLastUsed() {
    if (!recents.length) {
      await showToast({
        style: Toast.Style.Success,
        title: "Last Used is already empty",
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: "Clear Last Used GIFs?",
      message: `This will remove ${recents.length} item${recents.length === 1 ? "" : "s"} from Last Used. Favorites and local GIFs will remain.`,
      primaryAction: {
        title: "Clear Last Used",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    await clearRecents();
    setRecents([]);
    await showToast({
      style: Toast.Style.Success,
      title: "Cleared Last Used GIFs",
    });
  }

  async function remove(item: GifItem) {
    if (!item.localPath) return;
    if (item.watchedFolder) {
      const confirmed = await confirmAlert({
        title: "Stop Watching GIF Folder?",
        message: `This removes all GIFs from “${item.watchedFolder}” from the extension. Files on disk will not be changed.`,
        primaryAction: {
          title: "Stop Watching",
          style: Alert.ActionStyle.Destructive,
        },
      });
      if (!confirmed) return;
      await removeLocalFolder(item.watchedFolder);
      await reloadLibrary();
      return;
    }
    if (
      !(await confirmAlert({
        title: `Remove “${item.title}”?`,
        message: "The library copy will be deleted.",
      }))
    )
      return;
    await removeLocalGif(item.id);
    await fs.unlink(item.localPath).catch(() => undefined);
    await reloadLibrary();
  }

  async function refreshFolders() {
    if (await reloadLibrary()) {
      await showToast({
        style: Toast.Style.Success,
        title: "Refreshed GIF folders",
      });
    }
  }

  const emptyTitle = error
    ? "KLIPY Search Failed"
    : view === "all"
      ? "No GIFs Yet"
      : view === "search"
        ? "Search KLIPY"
        : `No ${view} GIFs`;
  const emptyDescription =
    error ??
    (view === "all" || view === "search"
      ? "Type a search or browse trending GIFs"
      : undefined);

  const renderItem = (item: GifItem) => (
    <Grid.Item
      key={item.id}
      content={{
        source:
          item.source === "local" && item.localPath
            ? localPreviewSource(item.localPath)
            : item.previewUrl,
        fallback: Icon.Image,
      }}
      title={item.title}
      subtitle={subtitle(item)}
      actions={
        <ActionPanel>
          <Action
            title="Copy Optimized GIF"
            icon={Icon.Clipboard}
            onAction={() => void copy(item)}
          />
          <Action
            title="Copy Original GIF"
            icon={Icon.Clipboard}
            onAction={() => void copyOriginal(item)}
          />
          <Action
            title={
              favoriteIds.has(item.id)
                ? "Remove from Favorites"
                : "Add to Favorites"
            }
            icon={Icon.Star}
            onAction={() => void favorite(item)}
          />
          <Action.Push
            title="Import GIFs or Folder"
            icon={Icon.Download}
            target={
              <ImportGifs
                onImported={async () => {
                  await reloadLibrary();
                }}
              />
            }
          />
          <Action
            title="Refresh GIF Folders"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => void refreshFolders()}
          />
          <Action
            title="Clear Last Used"
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            style={Action.Style.Destructive}
            onAction={() => void clearLastUsed()}
          />
          {item.source === "local" ? (
            <Action
              title={
                item.watchedFolder
                  ? "Stop Watching GIF Folder"
                  : "Remove Local GIF"
              }
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void remove(item)}
            />
          ) : null}
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );

  const hasItems = view === "all" ? allSections.length > 0 : visible.length > 0;

  return (
    <Grid
      columns={5}
      inset={Grid.Inset.Small}
      isLoading={
        libraryLoading || ((view === "all" || view === "search") && loading)
      }
      searchBarPlaceholder={
        view === "all"
          ? "Search favorites, recents, and KLIPY"
          : view === "search"
            ? "Search KLIPY"
            : `Filter ${view}`
      }
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Library"
          value={view}
          onChange={(value) => setView(value as View)}
        >
          <Grid.Dropdown.Item title="All GIFs" value="all" icon={Icon.List} />
          <Grid.Dropdown.Item
            title="Favorites"
            value="favorites"
            icon={Icon.Star}
          />
          <Grid.Dropdown.Item
            title="Last Used"
            value="recents"
            icon={Icon.Clock}
          />
          <Grid.Dropdown.Item
            title="Local GIFs"
            value="local"
            icon={Icon.HardDrive}
          />
          <Grid.Dropdown.Item
            title="KLIPY Search"
            value="search"
            icon={Icon.MagnifyingGlass}
          />
        </Grid.Dropdown>
      }
    >
      {!hasItems ? (
        <Grid.EmptyView
          icon={error ? Icon.Warning : Icon.Image}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : null}
      {view === "all"
        ? allSections.map((section) => (
            <Grid.Section key={section.key} title={section.title}>
              {section.items.map(renderItem)}
            </Grid.Section>
          ))
        : visible.map(renderItem)}
    </Grid>
  );
}
