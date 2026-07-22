import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  Grid,
  Icon,
  Keyboard,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";
import manifestData from "./data/screenshots.json";
import { filterCatalog } from "./lib/catalog";
import {
  addRecentIdAndSave,
  clearRecentIds,
  loadCollections,
  saveFavoriteIds,
  toggleFavoriteId,
} from "./lib/collections";
import { copyScreenshotFile } from "./lib/copy-workflow";
import { downloadJpeg, removeStaleClipboardFiles } from "./lib/image-download";
import type { CatalogFilter, Screenshot, ScreenshotManifest } from "./types";

const manifest = manifestData as ScreenshotManifest;
const PAGE_SIZE = 60;
const SOURCE_WEBSITE_URL = manifest.sourceWebsiteUrl;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function SearchScreenshotsCommand() {
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isCopying, setIsCopying] = useState(false);
  const isCopyingRef = useRef(false);

  const validIds = useMemo(() => new Set(manifest.screenshots.map((screenshot) => screenshot.id)), []);
  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const seriesTitleById = useMemo(() => new Map(manifest.series.map((series) => [series.id, series.title])), []);

  useEffect(() => {
    let cancelled = false;
    loadCollections(validIds)
      .then((collections) => {
        if (cancelled) return;
        setFavoriteIds(collections.favoriteIds);
        setRecentIds(collections.recentIds);
      })
      .catch((error) => {
        if (!cancelled) void showToast(Toast.Style.Failure, "Could Not Load Saved Collections", errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCollections(false);
      });
    return () => {
      cancelled = true;
    };
  }, [validIds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [catalogFilter, searchText]);

  const filteredScreenshots = useMemo(
    () => filterCatalog({ manifest, filter: catalogFilter, favoriteIds, recentIds, query: searchText }),
    [catalogFilter, favoriteIds, recentIds, searchText],
  );
  const visibleScreenshots = filteredScreenshots.slice(0, visibleCount);

  async function toggleFavorite(screenshot: Screenshot) {
    const result = toggleFavoriteId(favoriteIds, screenshot.id);
    setFavoriteIds(result.ids);
    try {
      await saveFavoriteIds(result.ids);
      await showToast(
        Toast.Style.Success,
        result.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        screenshot.title,
      );
    } catch (error) {
      setFavoriteIds(favoriteIds);
      await showToast(Toast.Style.Failure, "Could Not Update Favorites", errorMessage(error));
    }
  }

  async function copyScreenshot(screenshot: Screenshot) {
    if (isCopyingRef.current) return;
    isCopyingRef.current = true;
    setIsCopying(true);

    try {
      const toast = await showToast(Toast.Style.Animated, "Downloading Screenshot…", screenshot.title);
      try {
        const result = await copyScreenshotFile({
          screenshot,
          download: downloadJpeg,
          copyFile: async (path) => Clipboard.copy({ file: path }),
          removeStaleFiles: removeStaleClipboardFiles,
        });
        if (result === "busy") {
          toast.hide();
          return;
        }
        try {
          const nextRecentIds = await addRecentIdAndSave(screenshot.id, validIds);
          setRecentIds(nextRecentIds);
        } catch {
          toast.hide();
          await showHUD("Copied Screenshot · Recent Not Saved");
          return;
        }
        toast.hide();
        await showHUD("Copied Screenshot");
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could Not Copy Screenshot";
        toast.message = errorMessage(error);
      }
    } finally {
      isCopyingRef.current = false;
      setIsCopying(false);
    }
  }

  async function clearRecent() {
    const confirmed = await confirmAlert({
      title: "Clear Recently Used?",
      message: "This removes the locally stored list of recently copied screenshots.",
      primaryAction: { title: "Clear Recently Used", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await clearRecentIds();
      setRecentIds([]);
      await showToast(Toast.Style.Success, "Cleared Recently Used");
    } catch (error) {
      await showToast(Toast.Style.Failure, "Could Not Clear Recently Used", errorMessage(error));
    }
  }

  function actionsFor(screenshot: Screenshot) {
    const isFavorite = favoriteIdSet.has(screenshot.id);
    return (
      <ActionPanel>
        <Action
          title={isCopying ? "Copying Screenshot…" : "Copy Screenshot"}
          icon={Icon.Clipboard}
          onAction={isCopying ? undefined : () => copyScreenshot(screenshot)}
        />
        <Action
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          onAction={() => toggleFavorite(screenshot)}
        />
        <Action.CopyToClipboard
          title="Copy Image URL"
          content={screenshot.copyUrl}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
        <Action.OpenInBrowser title="Open Image in Browser" url={screenshot.copyUrl} />
        <Action.OpenInBrowser title="Open Source Website" url={SOURCE_WEBSITE_URL} />
        {catalogFilter === "recent" ? (
          <Action
            title="Clear Recently Used"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={clearRecent}
          />
        ) : null}
      </ActionPanel>
    );
  }

  const emptyTitle =
    catalogFilter === "favorites"
      ? "No Favorite Screenshots"
      : catalogFilter === "recent"
        ? "No Recently Used Screenshots"
        : "No Screenshots Found";
  const emptyDescription = searchText ? "Try a different search phrase." : "Choose another collection or series.";

  return (
    <Grid
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      filtering={false}
      isLoading={isLoadingCollections}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search dialogue…"
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visibleCount < filteredScreenshots.length,
        onLoadMore: () => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredScreenshots.length)),
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Collection or Series"
          value={catalogFilter}
          onChange={(value) => setCatalogFilter(value as CatalogFilter)}
        >
          <Grid.Dropdown.Section title="Library">
            <Grid.Dropdown.Item title="All Screenshots" value="all" icon={Icon.Image} />
            <Grid.Dropdown.Item title="Favorites" value="favorites" icon={Icon.Star} />
            <Grid.Dropdown.Item title="Recently Used" value="recent" icon={Icon.Clock} />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Series">
            {manifest.series
              .slice()
              .sort((left, right) => left.order - right.order)
              .map((series) => (
                <Grid.Dropdown.Item key={series.id} title={series.title} value={`series:${series.id}`} />
              ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {visibleScreenshots.length === 0 ? (
        <Grid.EmptyView title={emptyTitle} description={emptyDescription} icon={Icon.Image} />
      ) : (
        visibleScreenshots.map((screenshot) => {
          const isFavorite = favoriteIdSet.has(screenshot.id);
          const seriesTitle = seriesTitleById.get(screenshot.seriesId) ?? screenshot.seriesId;
          return (
            <Grid.Item
              key={screenshot.id}
              id={screenshot.id}
              content={{ source: screenshot.previewUrl, fallback: Icon.Image }}
              title={screenshot.title}
              subtitle={`${seriesTitle} · EP ${screenshot.episode}`}
              accessory={isFavorite ? { icon: Icon.Star, tooltip: "Favorite" } : undefined}
              actions={actionsFor(screenshot)}
            />
          );
        })
      )}
    </Grid>
  );
}
