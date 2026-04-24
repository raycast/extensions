import {
  Action,
  ActionPanel,
  Detail,
  Grid,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
  Color,
  Cache,
  showHUD,
} from "@raycast/api";
import { useCachedState, useFetch, usePromise } from "@raycast/utils";
import { useState } from "react";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { pathToFileURL } from "url";
import { setWindowsWallpaper } from "./utils";

const cache = new Cache();

interface WallhavenResponse {
  data: {
    id: string;
    path: string;
    thumbs: { small: string };
  }[];
}

interface WallpaperItem {
  id: string;
  urlOrPath: string;
  thumbnail: string;
  source: "wallhaven" | "local";
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.WallpaperManager>();
  const [source, setSource] = useState<"wallhaven" | "local" | "favorites">(
    "wallhaven",
  );
  const [searchText, setSearchText] = useState("");
  const [favorites, setFavorites] = useCachedState<WallpaperItem[]>(
    "favorite-wallpapers",
    [],
  );
  const [excluded, setExcluded] = useCachedState<string[]>(
    "excluded-wallpapers",
    [],
  );
  const [autoSwitch, setAutoSwitch] = useCachedState<{
    enabled: boolean;
    source: "local" | "favorites";
  }>("auto-switch-config", { enabled: false, source: "local" });

  // Fetch Wallhaven with Pagination
  const {
    isLoading: isWallhavenLoading,
    data: wallhavenData,
    pagination,
    revalidate,
  } = useFetch(
    (options) =>
      "https://wallhaven.cc/api/v1/search?" +
      new URLSearchParams({
        purity: "100",
        ratios: "16x9,16x10,21x9,32x9",
        sorting: "random",
        page: String(options.page + 1), // options.page starts at 0
        q: searchText,
      }).toString(),
    {
      execute: source === "wallhaven",
      mapResult(result: WallhavenResponse) {
        const items = result.data.map((item) => ({
          id: item.id,
          urlOrPath: item.path,
          thumbnail: item.thumbs.small,
          source: "wallhaven" as const,
        }));
        return {
          data: items,
          hasMore: items.length > 0,
        };
      },
      initialData: [],
      keepPreviousData: true,
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch Wallhaven",
          message: String(error),
        });
      },
    },
  );

  // Fetch Local Files
  const { isLoading: isLocalLoading, data: localData } = usePromise(
    async (localPath: string | undefined, query: string) => {
      if (!localPath) return [];
      try {
        const files = await fs.readdir(localPath);
        const imageFiles = files.filter((f) =>
          /\.(jpg|jpeg|png|webp)$/i.test(f),
        );
        const filtered = query
          ? imageFiles.filter((f) =>
              f.toLowerCase().includes(query.toLowerCase()),
            )
          : imageFiles;
        return filtered.map((file) => {
          const fullPath = path.join(localPath, file);
          return {
            id: fullPath,
            urlOrPath: fullPath,
            thumbnail: pathToFileURL(fullPath).href,
            source: "local" as const,
          };
        });
      } catch (err) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to read local folder",
          message: String(err),
        });
        return [];
      }
    },
    [preferences.localFolderPath, searchText],
    { execute: source === "local" },
  );

  let displayedWallpapers =
    source === "wallhaven"
      ? wallhavenData
      : source === "favorites"
        ? favorites
        : localData || [];
  if (source === "favorites" && searchText) {
    displayedWallpapers = displayedWallpapers.filter(
      (w) => w.id.includes(searchText) || w.urlOrPath.includes(searchText),
    );
  }
  const wallpapers = displayedWallpapers;
  const isLoading =
    source === "wallhaven"
      ? isWallhavenLoading
      : source === "local"
        ? isLocalLoading
        : false;

  async function handleSetWallpaper(item: WallpaperItem) {
    try {
      await showHUD("Setting wallpaper...");
      await setWindowsWallpaper(item.urlOrPath);
      cache.set("last-wallpaper-id", item.id);
    } catch {
      await showHUD("Failed to set wallpaper");
    }
  }

  async function handleDownloadWallpaper(item: WallpaperItem) {
    if (item.source !== "wallhaven") return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
    });
    try {
      const response = await fetch(item.urlOrPath);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname(item.urlOrPath) || ".jpg";
      const filename = `wallhaven-${item.id}${ext}`;
      const targetDir =
        preferences.downloadFolderPath || path.join(os.homedir(), "Downloads");
      const downloadPath = path.join(targetDir, filename);
      await fs.writeFile(downloadPath, buffer);

      toast.style = Toast.Style.Success;
      toast.title = "Downloaded!";
      toast.message = `Saved to ${targetDir}`;
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to download";
      toast.message = String(e);
    }
  }

  function toggleFavorite(item: WallpaperItem) {
    const isFavorite = favorites.some((f) => f.id === item.id);
    if (isFavorite) {
      setFavorites(favorites.filter((f) => f.id !== item.id));
      showToast({
        style: Toast.Style.Success,
        title: "Removed from Favorites",
      });
    } else {
      setFavorites([...favorites, item]);
      showToast({ style: Toast.Style.Success, title: "Added to Favorites" });
    }
  }

  function toggleExclude(item: WallpaperItem) {
    if (excluded.includes(item.id)) {
      setExcluded(excluded.filter((id) => id !== item.id));
    } else {
      setExcluded([...excluded, item.id]);
    }
  }

  if (!preferences.localFolderPath) {
    return (
      <Detail
        markdown="## Local Folder Path Required\n\nPlease set your Local Folder Path in the extension preferences to use this extension."
        actions={
          <ActionPanel>
            <Action
              title="Open Preferences"
              onAction={() => openExtensionPreferences()}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Grid
      isLoading={isLoading}
      itemSize={Grid.ItemSize.Large}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        source === "wallhaven"
          ? "Search Wallhaven (e.g. anime, nature)..."
          : "Search local files..."
      }
      throttle
      pagination={source === "wallhaven" ? pagination : undefined}
      searchBarAccessory={
        <Grid.Dropdown
          id="source-dropdown"
          tooltip="Select Source"
          storeValue={true}
          onChange={(newValue) => {
            setSource(newValue as "wallhaven" | "local");
            setSearchText(""); // reset search when switching source
          }}
        >
          <Grid.Dropdown.Item
            title="Wallhaven"
            value="wallhaven"
            icon={Icon.Globe}
          />
          <Grid.Dropdown.Item
            title="Local Folder"
            value="local"
            icon={Icon.Folder}
          />
          <Grid.Dropdown.Item
            title="Favorites"
            value="favorites"
            icon={Icon.Star}
          />
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        title={isLoading ? "Loading..." : "No Wallpapers Found"}
        description={
          source === "local"
            ? "Add some images to your Local Folder Path"
            : "Try a different search"
        }
      />
      {wallpapers?.map((item) => {
        const isExcluded = excluded.includes(item.id);
        return (
          <Grid.Item
            key={item.id}
            content={item.thumbnail}
            title=""
            accessory={
              isExcluded
                ? {
                    icon: {
                      source: Icon.XMarkCircle,
                      tintColor: Color.SecondaryText,
                    },
                    tooltip: "Excluded",
                  }
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Set Wallpaper"
                  icon={Icon.Image}
                  onAction={() => handleSetWallpaper(item)}
                />
                <Action.Push
                  title="Preview Wallpaper"
                  icon={Icon.Eye}
                  target={
                    <Detail
                      markdown={`<img src="${item.source === "local" ? pathToFileURL(item.urlOrPath).href : item.urlOrPath}" alt="Preview" height="320" />`}
                      actions={
                        <ActionPanel>
                          <Action
                            title="Set Wallpaper"
                            icon={Icon.Image}
                            onAction={() => handleSetWallpaper(item)}
                          />
                        </ActionPanel>
                      }
                    />
                  }
                />
                {item.source === "wallhaven" && (
                  <Action
                    title="Download"
                    icon={Icon.Download}
                    shortcut={{ modifiers: ["ctrl"], key: "d" }}
                    onAction={() => handleDownloadWallpaper(item)}
                  />
                )}
                <Action
                  title={
                    favorites.some((f) => f.id === item.id)
                      ? "Remove from Favorites"
                      : "Add to Favorites"
                  }
                  icon={
                    favorites.some((f) => f.id === item.id)
                      ? Icon.StarDisabled
                      : Icon.Star
                  }
                  shortcut={{ modifiers: ["ctrl"], key: "f" }}
                  onAction={() => toggleFavorite(item)}
                />
                {source !== "wallhaven" && (
                  <Action
                    title={
                      autoSwitch.enabled && autoSwitch.source === source
                        ? "Disable Auto Switch"
                        : `Enable Auto Switch (${source === "favorites" ? "Favorites" : "Local"})`
                    }
                    icon={
                      autoSwitch.enabled && autoSwitch.source === source
                        ? Icon.Multiply
                        : Icon.Checkmark
                    }
                    shortcut={{ modifiers: ["ctrl"], key: "r" }}
                    onAction={() => {
                      if (autoSwitch.enabled && autoSwitch.source === source) {
                        setAutoSwitch({ enabled: false, source: source });
                        showToast({
                          style: Toast.Style.Success,
                          title: "Auto Switch Disabled",
                        });
                      } else {
                        setAutoSwitch({ enabled: true, source: source });
                        showToast({
                          style: Toast.Style.Success,
                          title: `Auto Switch Enabled for ${source === "favorites" ? "Favorites" : "Local Folder"}`,
                        });
                      }
                    }}
                  />
                )}
                {source === "wallhaven" && (
                  <Action
                    title="Refresh Wallhaven"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["ctrl"], key: "r" }}
                    onAction={() => revalidate()}
                  />
                )}
                {source !== "wallhaven" && (
                  <Action
                    title={
                      isExcluded
                        ? "Include in Auto-Switch"
                        : "Exclude from Auto-Switch"
                    }
                    icon={isExcluded ? Icon.PlusCircle : Icon.MinusCircle}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => toggleExclude(item)}
                  />
                )}
                {source === "wallhaven" && (
                  <Action.OpenInBrowser
                    title="Open on Wallhaven"
                    url={`https://wallhaven.cc/w/${item.id}`}
                  />
                )}
                {source === "local" && (
                  <Action.ShowInFinder
                    title="Show in Explorer"
                    path={item.urlOrPath}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
