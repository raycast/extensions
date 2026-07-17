import {
  Grid,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  useNavigation,
  LocalStorage,
} from "@raycast/api";
import { FC, useEffect, useState, useMemo, useCallback } from "react";
import {
  getIconIndex,
  IconIndexEntry,
  IconError,
  NetworkError,
  CacheError,
} from "./utils/icons";
import { ActionPanelForIcon } from "./ActionPanelForIcon";
import { getPreferences, KEYBOARD_SHORTCUTS } from "./utils/preferences";
import PreferencesView from "./preferences";

/**
 * Normalizes a string by converting to lowercase and removing special characters.
 * Used for case-insensitive and format-insensitive string matching.
 *
 * @param str - The string to normalize
 * @returns The normalized string with special characters removed
 */
const normalize = (str: string): string =>
  str.toLowerCase().replace(/[-\s_]+/g, "");

/**
 * Manages a windowed view of icons with pagination and search filtering.
 * Implements efficient caching of normalized strings for better performance.
 */
class IconWindow {
  private icons: IconIndexEntry[] = [];
  private normalizedCache = new Map<string, string>();
  private readonly windowSize = 50;
  private currentOffset = 0;

  /**
   * Sets or updates the list of icons and resets the window state.
   * @param icons - Array of icons to manage
   */
  setIcons(icons: IconIndexEntry[]) {
    this.icons = icons;
    this.currentOffset = 0;
    this.normalizedCache.clear();
  }

  /**
   * Gets the normalized version of a string, using cache if available.
   * @param str - String to normalize
   * @returns Normalized string
   */
  getNormalizedString(str: string): string {
    const cached = this.normalizedCache.get(str);
    if (cached) return cached;

    const normalized = normalize(str);
    this.normalizedCache.set(str, normalized);
    return normalized;
  }

  /**
   * Filters icons based on search text, implementing windowed pagination.
   * @param searchText - Text to filter icons by
   * @returns Array of filtered icons limited by window size
   */
  getFilteredIcons(searchText: string): IconIndexEntry[] {
    const normalizedSearch = this.getNormalizedString(searchText.trim());

    if (!normalizedSearch) {
      return this.icons.slice(0, this.windowSize);
    }

    const results: IconIndexEntry[] = [];
    for (
      let i = this.currentOffset;
      i < this.icons.length && results.length < this.windowSize;
      i++
    ) {
      const icon = this.icons[i];
      const normalizedName = this.getNormalizedString(icon.Name);
      const normalizedRef = this.getNormalizedString(icon.Reference);
      const normalizedTags = icon.Tags
        ? this.getNormalizedString(icon.Tags)
        : "";

      if (
        normalizedName.includes(normalizedSearch) ||
        normalizedRef.includes(normalizedSearch) ||
        normalizedTags.includes(normalizedSearch)
      ) {
        results.push(icon);
      }
    }

    return results;
  }

  /**
   * Advances to the next page of results.
   */
  nextPage() {
    this.currentOffset = Math.min(
      this.currentOffset + this.windowSize,
      this.icons.length,
    );
  }

  /**
   * Checks if there are more icons available after the current window.
   * @returns True if more icons are available
   */
  hasMore(): boolean {
    return this.currentOffset < this.icons.length;
  }

  /**
   * Resets the window to the beginning of the icon list.
   */
  reset() {
    this.currentOffset = 0;
  }
}

/**
 * Main command component for the Selfh.st Icons extension.
 * Handles icon loading, searching, filtering, and display.
 */
const Command: FC = () => {
  const [icons, setIcons] = useState<IconIndexEntry[] | null>(null);
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [currentVariant, setCurrentVariant] = useState<
    "default" | "light" | "dark"
  >("default");
  const { push } = useNavigation();

  // Create a stable reference to the window manager
  const iconWindow = useMemo(() => new IconWindow(), []);

  // Load preferences and watch for changes
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const prefs = await getPreferences();
        setCurrentVariant(prefs.theme === "system" ? "default" : prefs.theme);
      } catch (error) {
        console.error("Failed to load preferences:", error);
      }
    };

    // Initial load
    loadPrefs();

    // Set up interval to check for preference changes
    const checkInterval = setInterval(async () => {
      const lastUpdate = await LocalStorage.getItem(
        "selfhst_preferences_updated",
      );
      if (lastUpdate) {
        await LocalStorage.removeItem("selfhst_preferences_updated");
        loadPrefs();
      }
    }, 1000); // Check every second

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  const loadIcons = useCallback(
    async (forceRefresh = false) => {
      setIsLoading(true);
      try {
        const result = await getIconIndex({ forceRefresh });
        setIcons(result.data);
        iconWindow.setIcons(result.data);

        if (result.error) {
          showToast({
            style: Toast.Style.Success,
            title: "Using cached data",
            message: result.error,
          });
        }
      } catch (err) {
        let errorMessage = "Failed to load icons";
        if (err instanceof NetworkError) {
          errorMessage = "Network error: Check your internet connection";
        } else if (err instanceof CacheError) {
          errorMessage = "Cache error: Try clearing your Raycast cache";
        } else if (err instanceof IconError) {
          errorMessage = `${err.code}: ${err.message}`;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        setError(errorMessage);
        setIcons(null);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load icons",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [iconWindow],
  );

  useEffect(() => {
    loadIcons();
  }, [loadIcons]);

  // Reset window position when search text changes
  useEffect(() => {
    iconWindow.reset();
  }, [searchText, iconWindow]);

  const filteredIcons = useMemo(() => {
    if (!icons) return [];
    return iconWindow.getFilteredIcons(searchText);
  }, [icons, searchText, iconWindow]);

  const getIconUrl = useCallback(
    (icon: IconIndexEntry) => {
      // Only use variant suffix if not default and the variant is supported
      if (
        currentVariant === "default" ||
        icon[currentVariant === "light" ? "Light" : "Dark"] !== "Yes"
      ) {
        return `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${icon.Reference}.png`;
      }
      return `https://cdn.jsdelivr.net/gh/selfhst/icons/png/${icon.Reference}-${currentVariant}.png`;
    },
    [currentVariant],
  );

  if (error) {
    return (
      <Grid
        isLoading={isLoading}
        searchBarPlaceholder="Search icons..."
        onSearchTextChange={setSearchText}
        columns={6}
        aspectRatio="1"
        inset={Grid.Inset.Large}
      >
        <Grid.EmptyView
          icon={Icon.ExclamationMark}
          title="Error loading icons"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                onAction={() => loadIcons(true)}
                icon={Icon.RotateClockwise}
              />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search icons..."
      columns={6}
      aspectRatio="1"
      inset={Grid.Inset.Large}
    >
      {searchText.trim() === "" && (
        <Grid.Section title="Actions" subtitle="Quick access">
          <Grid.Item
            content={Icon.Gear}
            title="Preferences"
            actions={
              <ActionPanel>
                <Action
                  title="Open Preferences"
                  onAction={() => push(<PreferencesView key={Date.now()} />)}
                  icon={Icon.Gear}
                />
              </ActionPanel>
            }
          />
          <Grid.Item
            content="https://cdn.jsdelivr.net/gh/selfhst/icons/png/selfh-st.png"
            title="Visit selfh.st"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Selfh.st"
                  url="https://selfh.st/"
                  icon={Icon.Globe}
                />
              </ActionPanel>
            }
          />
          <Grid.Item
            content={Icon.RotateClockwise}
            title="Refresh Icons"
            actions={
              <ActionPanel>
                <Action
                  title="Refresh Icon Index"
                  onAction={() => loadIcons(true)}
                  shortcut={KEYBOARD_SHORTCUTS.REFRESH_INDEX}
                  icon={Icon.RotateClockwise}
                />
              </ActionPanel>
            }
          />
        </Grid.Section>
      )}
      <Grid.Section title="Icons">
        {filteredIcons.map((icon) => (
          <Grid.Item
            key={icon.Reference}
            content={getIconUrl(icon)}
            title={icon.Name}
            actions={
              <ActionPanelForIcon
                icon={icon}
                currentVariant={currentVariant}
                onVariantChange={setCurrentVariant}
              />
            }
          />
        ))}
      </Grid.Section>
      {filteredIcons.length === 0 && (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Icons Found"
          description="No icons match your search."
        />
      )}
    </Grid>
  );
};

export default Command;
