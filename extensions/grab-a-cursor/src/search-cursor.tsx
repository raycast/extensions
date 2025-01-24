import { useState, useEffect } from "react";
import {
  Grid,
  getPreferenceValues,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { CursorGridItem } from "./components/CursorGridItem";
import { CursorItem, FilterState, SectionFilter } from "./types/cursor";
import { DISPLAY_SIZE_TO_ITEMS, SEARCH } from "./constants";
import { FilesystemCursorRepository } from "./repositories/FilesystemCursorRepository";
import {
  isValidSVG,
  isValidCursorName,
  isValidCategory,
  isAcceptableCursorSize,
} from "./utils/validation";

interface DisplayPreferences {
  displaySize: "small" | "medium" | "large";
}

/**
 * Loads all cursors from the filesystem and categorizes them.
 * @returns {Promise<CursorItem[]>} A promise that resolves to an array of cursor items
 */
async function loadCursors(): Promise<CursorItem[]> {
  const repository = new FilesystemCursorRepository();
  const categorizedCursors = await repository.loadCursorsByCategory();

  return Object.entries(categorizedCursors).flatMap(([category, cursors]) =>
    Object.entries(cursors).map(([name, metadata]) => ({
      id: `${category}-${name}`,
      name,
      path: metadata.filePath,
      content: metadata.svgContent,
      category,
      isFavorited: metadata.isFavorited || false,
    })),
  );
}

/**
 * Main command component for the Grab a Cursor extension.
 * Provides functionality to browse, search, and manage SVG cursors.
 */
export default function Command() {
  // State management for cursors and UI
  const [cursors, setCursors] = useState<CursorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<Record<string, number>>({});
  const [showFrequentlyUsed, setShowFrequentlyUsed] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    selectedSection: "all",
  });
  const [displaySize, setDisplaySize] = useState<"small" | "medium" | "large">(
    getPreferenceValues<DisplayPreferences>().displaySize,
  );
  const repository = new FilesystemCursorRepository();

  /**
   * Updates the display size preference and persists it to storage
   * @param newSize - The new display size to set
   */
  const handleDisplaySizeChange = async (
    newSize: "small" | "medium" | "large",
  ) => {
    setDisplaySize(newSize);
    await LocalStorage.setItem("display-size-preference", newSize);
  };

  // Load saved display size preference
  useEffect(() => {
    async function loadDisplaySize() {
      const savedSize = await LocalStorage.getItem<
        "small" | "medium" | "large"
      >("display-size-preference");
      if (savedSize) {
        setDisplaySize(savedSize);
      }
    }
    loadDisplaySize();
  }, []);

  // Initialize cursors and usage stats
  useEffect(() => {
    async function initialize() {
      try {
        const loadedCursors = await loadCursors();
        const stats = await repository.getCursorUsageStats();
        setCursors(loadedCursors);
        setUsageStats(stats);
        setShowFrequentlyUsed(Object.keys(stats).length > 0);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        console.error("Error loading cursors:", errorMessage);
        setError(
          `Failed to load cursors: ${errorMessage}. Please check your cursors directory.`,
        );
      } finally {
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Cursors",
        message: error,
      });
    }
  }, [error]);

  /**
   * Handles copying a cursor and updates usage statistics
   * @param cursor - The cursor item being copied
   */
  const handleCopy = async (cursor: CursorItem) => {
    try {
      // Validate cursor before copying
      if (!cursor.content || !isValidSVG(cursor.content)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Cursor",
          message: "The cursor content is not valid SVG",
        });
        return;
      }

      if (!isAcceptableCursorSize(cursor.content)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Cursor Too Large",
          message: "The cursor file size exceeds the maximum limit",
        });
        return;
      }

      await repository.trackCursorUsage(cursor.id);
      const newStats = await repository.getCursorUsageStats();
      setUsageStats(newStats);
      setShowFrequentlyUsed(true);
      await showToast({
        style: Toast.Style.Success,
        title: "Cursor Copied",
        message: `${cursor.name} has been copied to clipboard`,
      });
    } catch (err) {
      console.error("Error tracking cursor usage:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Track Usage",
        message: "Could not update cursor usage statistics",
      });
    }
  };

  /**
   * Adds a cursor to favorites
   * @param cursor - The cursor item to favorite
   */
  const handleFavorite = async (cursor: CursorItem) => {
    try {
      // Validate cursor name and category
      if (!isValidCursorName(cursor.name)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Cursor Name",
          message: "The cursor name contains invalid characters",
        });
        return;
      }

      if (!isValidCategory(cursor.category)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Invalid Category",
          message: "The cursor category contains invalid characters",
        });
        return;
      }

      await repository.favoriteCursor(cursor.id);
      const updatedCursors = await loadCursors();
      setCursors(updatedCursors);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
        message: `${cursor.name} has been added to favorites`,
      });
    } catch (err) {
      console.error("Error favoriting cursor:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Favorite",
        message: "Could not add cursor to favorites",
      });
    }
  };

  /**
   * Removes a cursor from favorites
   * @param cursor - The cursor item to remove from favorites
   */
  const handleRemoveFavorite = async (cursor: CursorItem) => {
    try {
      await repository.removeFavorite(cursor.id);
      const updatedCursors = await loadCursors();
      setCursors(updatedCursors);
      await showToast({
        style: Toast.Style.Success,
        title: "Removed from Favorites",
        message: `${cursor.name} has been removed from favorites`,
      });
    } catch (err) {
      console.error("Error removing cursor from favorites:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Remove",
        message: "Could not remove cursor from favorites",
      });
    }
  };

  /**
   * Resets the frequently used cursors statistics
   */
  const handleResetFrequentlyUsed = async () => {
    try {
      await repository.resetUsageStats();
      setUsageStats({});
      setShowFrequentlyUsed(false);
      await showToast({
        style: Toast.Style.Success,
        title: "Stats Reset",
        message: "Usage statistics have been reset",
      });
    } catch (err) {
      console.error("Error resetting usage stats:", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Reset",
        message: "Could not reset usage statistics",
      });
    }
  };

  if (error) {
    return (
      <Grid isLoading={false} searchBarPlaceholder={SEARCH.PLACEHOLDER}>
        <Grid.EmptyView title={SEARCH.ERROR_TITLE} description={error} />
      </Grid>
    );
  }

  const favoriteCursors = cursors.filter((cursor) => cursor.isFavorited);

  const frequentlyUsedCursors = cursors
    .filter((cursor) => usageStats[cursor.id] > 0)
    .sort((a, b) => {
      const usageA = usageStats[a.id] || 0;
      const usageB = usageStats[b.id] || 0;
      return usageB - usageA;
    })
    .slice(0, DISPLAY_SIZE_TO_ITEMS[displaySize]);

  const cursorsByCategory = cursors.reduce(
    (acc, cursor) => {
      if (!acc[cursor.category]) {
        acc[cursor.category] = [];
      }
      acc[cursor.category].push(cursor);
      return acc;
    },
    {} as Record<string, CursorItem[]>,
  );

  // Create section filters including "All" option and special sections
  const sectionFilters: SectionFilter[] = [
    { id: "all", title: "All cursors", value: "all" },
    ...(favoriteCursors.length > 0
      ? [{ id: "favorites", title: "Favorites", value: "favorites" }]
      : []),
    ...(showFrequentlyUsed && frequentlyUsedCursors.length > 0
      ? [
          {
            id: "frequently-used",
            title: "Frequently Used",
            value: "frequently-used",
          },
        ]
      : []),
    ...Object.keys(cursorsByCategory)
      .sort((a, b) => b.localeCompare(a))
      .map((category) => ({
        id: category,
        title: category,
        value: category,
      })),
  ];

  return (
    <Grid
      columns={DISPLAY_SIZE_TO_ITEMS[displaySize]}
      isLoading={isLoading}
      searchBarPlaceholder={SEARCH.PLACEHOLDER}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by Section"
          onChange={(newValue) => setFilterState({ selectedSection: newValue })}
          value={filterState.selectedSection}
        >
          {sectionFilters.map((filter) => (
            <Grid.Dropdown.Item
              key={filter.id}
              title={filter.title}
              value={filter.value}
            />
          ))}
        </Grid.Dropdown>
      }
      filtering={{
        keepSectionOrder: true,
      }}
    >
      {filterState.selectedSection === "all" && (
        <>
          {favoriteCursors.length > 0 && (
            <Grid.Section
              title="Favorites"
              subtitle={`${favoriteCursors.length}`}
            >
              {favoriteCursors.map((cursor) => (
                <CursorGridItem
                  key={`favorite-${cursor.id}`}
                  cursor={cursor}
                  onCopy={handleCopy}
                  onFavorite={handleFavorite}
                  onRemoveFavorite={handleRemoveFavorite}
                  onResetFrequentlyUsed={
                    showFrequentlyUsed ? handleResetFrequentlyUsed : undefined
                  }
                  showResetAction={showFrequentlyUsed}
                  currentDisplaySize={displaySize}
                  onDisplaySizeChange={handleDisplaySizeChange}
                />
              ))}
            </Grid.Section>
          )}

          {showFrequentlyUsed && frequentlyUsedCursors.length > 0 && (
            <Grid.Section
              title="Frequently Used"
              subtitle={`${frequentlyUsedCursors.length}`}
            >
              {frequentlyUsedCursors.map((cursor) => (
                <CursorGridItem
                  key={`frequent-${cursor.id}`}
                  cursor={cursor}
                  onCopy={handleCopy}
                  onFavorite={handleFavorite}
                  onRemoveFavorite={handleRemoveFavorite}
                  onResetFrequentlyUsed={handleResetFrequentlyUsed}
                  showResetAction={true}
                  currentDisplaySize={displaySize}
                  onDisplaySizeChange={handleDisplaySizeChange}
                />
              ))}
            </Grid.Section>
          )}
        </>
      )}

      {filterState.selectedSection === "favorites" ? (
        <Grid.Section title="Favorites" subtitle={`${favoriteCursors.length}`}>
          {favoriteCursors.map((cursor) => (
            <CursorGridItem
              key={`favorite-${cursor.id}`}
              cursor={cursor}
              onCopy={handleCopy}
              onFavorite={handleFavorite}
              onRemoveFavorite={handleRemoveFavorite}
              onResetFrequentlyUsed={
                showFrequentlyUsed ? handleResetFrequentlyUsed : undefined
              }
              showResetAction={showFrequentlyUsed}
              currentDisplaySize={displaySize}
              onDisplaySizeChange={handleDisplaySizeChange}
            />
          ))}
        </Grid.Section>
      ) : filterState.selectedSection === "frequently-used" ? (
        <Grid.Section
          title="Frequently Used"
          subtitle={`${frequentlyUsedCursors.length}`}
        >
          {frequentlyUsedCursors.map((cursor) => (
            <CursorGridItem
              key={`frequent-${cursor.id}`}
              cursor={cursor}
              onCopy={handleCopy}
              onFavorite={handleFavorite}
              onRemoveFavorite={handleRemoveFavorite}
              onResetFrequentlyUsed={handleResetFrequentlyUsed}
              showResetAction={true}
              currentDisplaySize={displaySize}
              onDisplaySizeChange={handleDisplaySizeChange}
            />
          ))}
        </Grid.Section>
      ) : filterState.selectedSection !== "all" ? (
        <Grid.Section
          key={filterState.selectedSection}
          title={filterState.selectedSection}
          subtitle={`${cursorsByCategory[filterState.selectedSection]?.length || 0}`}
        >
          {(cursorsByCategory[filterState.selectedSection] || []).map(
            (cursor) => (
              <CursorGridItem
                key={`category-${cursor.id}`}
                cursor={cursor}
                onCopy={handleCopy}
                onFavorite={handleFavorite}
                onRemoveFavorite={handleRemoveFavorite}
                onResetFrequentlyUsed={
                  showFrequentlyUsed ? handleResetFrequentlyUsed : undefined
                }
                showResetAction={showFrequentlyUsed}
                currentDisplaySize={displaySize}
                onDisplaySizeChange={handleDisplaySizeChange}
              />
            ),
          )}
        </Grid.Section>
      ) : (
        Object.entries(cursorsByCategory)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([category, categoryItems]) => (
            <Grid.Section
              key={category}
              title={category}
              subtitle={`${categoryItems.length}`}
            >
              {categoryItems.map((cursor) => (
                <CursorGridItem
                  key={`category-${cursor.id}`}
                  cursor={cursor}
                  onCopy={handleCopy}
                  onFavorite={handleFavorite}
                  onRemoveFavorite={handleRemoveFavorite}
                  onResetFrequentlyUsed={
                    showFrequentlyUsed ? handleResetFrequentlyUsed : undefined
                  }
                  showResetAction={showFrequentlyUsed}
                  currentDisplaySize={displaySize}
                  onDisplaySizeChange={handleDisplaySizeChange}
                />
              ))}
            </Grid.Section>
          ))
      )}
    </Grid>
  );
}
