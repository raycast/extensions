import { useState, useEffect } from "react";
import path from "path";
import { Preferences } from "./types/preferences";
import { applyWallpaperUpdate, getWallpaperFiles, showWallpaperError } from "./utils";
import { DescriptionCache, getDescriptions } from "./ai-descriptions";
import { Action, ActionPanel, Grid, Icon, getPreferenceValues, openExtensionPreferences, open } from "@raycast/api";
import { File } from "./types/file";

const preferences = getPreferenceValues<Preferences>();
const wallpaperDir = preferences.wallpaperFolder;

const ALL_CATEGORIES = "all";
const UNCATEGORIZED = "uncategorized";
const CATEGORY_PREFIX = "category:";

export default function Command() {
  const [wallpapers, setWallpapers] = useState<File[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);
  const [descriptions, setDescriptions] = useState<DescriptionCache>({});

  useEffect(() => {
    getWallpaperFiles(wallpaperDir)
      .then(setWallpapers)
      .catch((error) => console.error("Error loading wallpapers:", error))
      .finally(() => setIsLoading(false));
  }, []);

  // Load AI descriptions in background — used for subtitle tags and unified search
  useEffect(() => {
    if (wallpapers.length > 0) {
      getDescriptions(wallpapers)
        .then(setDescriptions)
        .catch((error) => console.error("Error loading AI descriptions:", error));
    }
  }, [wallpapers]);

  // Subfolders of the wallpaper folder become categories automatically
  const categories = [...new Set(wallpapers.flatMap((file) => (file.category ? [file.category] : [])))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  );
  const hasUncategorized = wallpapers.some((file) => !file.category);

  // A remembered category may have been renamed or removed since the last run
  const isKnownCategory =
    selectedCategory === ALL_CATEGORIES ||
    (selectedCategory === UNCATEGORIZED && hasUncategorized) ||
    categories.includes(selectedCategory.slice(CATEGORY_PREFIX.length));
  const activeCategory = isKnownCategory ? selectedCategory : ALL_CATEGORIES;

  const categoryWallpapers = wallpapers.filter((file) => {
    if (activeCategory === ALL_CATEGORIES) return true;
    if (activeCategory === UNCATEGORIZED) return !file.category;
    return file.category === activeCategory.slice(CATEGORY_PREFIX.length);
  });

  // Unified search: score by keyword overlap across filename + description + tags
  const displayedWallpapers = (() => {
    if (!searchText.trim()) return categoryWallpapers;
    const queryWords = searchText.toLowerCase().split(/\s+/).filter(Boolean);
    return categoryWallpapers
      .map((file) => {
        const desc = descriptions[file.path];
        const baseName = path.basename(file.name, path.extname(file.name)).replace(/[-_]/g, " ");
        const haystack = [baseName, desc?.description, desc?.tags].filter(Boolean).join(" ").toLowerCase();
        const score = queryWords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
        return { file, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ file }) => file);
  })();

  const columnCount = {
    small: 7,
    medium: 5,
    large: 3,
  }[preferences.displaySize];

  return (
    <Grid
      columns={columnCount}
      fit={Grid.Fit.Fill}
      aspectRatio="16/9"
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name, color, mood, or style…"
      isLoading={isLoading}
      searchBarAccessory={
        categories.length > 0 ? (
          <Grid.Dropdown tooltip="Category" storeValue onChange={setSelectedCategory}>
            <Grid.Dropdown.Item title="All Wallpapers" value={ALL_CATEGORIES} icon={Icon.AppWindowGrid3x3} />
            {hasUncategorized && <Grid.Dropdown.Item title="Uncategorized" value={UNCATEGORIZED} icon={Icon.Image} />}
            <Grid.Dropdown.Section title="Categories">
              {categories.map((category) => (
                <Grid.Dropdown.Item
                  key={category}
                  title={category}
                  value={`${CATEGORY_PREFIX}${category}`}
                  icon={Icon.Folder}
                />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        ) : undefined
      }
    >
      <Grid.EmptyView
        icon={Icon.Image}
        title={searchText.trim() ? "No matches found" : "No wallpapers found. Add some images."}
      />
      {displayedWallpapers.map((file) => {
        const desc = descriptions[file.path];
        return (
          <Grid.Item
            key={file.path}
            title={preferences.showTitle ? file.name.split(".")[0].replace(/[-_]/g, " ") : ""}
            subtitle={desc?.tags || undefined}
            content={{ source: file.path }}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Wallpaper"
                  icon={Icon.Desktop}
                  onAction={() => applyWallpaperUpdate(file.path).catch(showWallpaperError)}
                />
                <Action.ShowInFinder path={file.path} />
                <Action title="Open Wallpaper Folder" icon={Icon.Folder} onAction={() => open(wallpaperDir)} />
                <Action
                  title="Open Preferences"
                  icon={Icon.Gear}
                  onAction={() => openExtensionPreferences()}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "," },
                    Windows: { modifiers: ["ctrl", "shift"], key: "," },
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </Grid>
  );
}
