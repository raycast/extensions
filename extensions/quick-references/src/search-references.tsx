import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReferenceActionPanel } from "./components/reference-actions";
import { ReferenceDetail } from "./components/reference-detail";
import { DatasetRepository } from "./core/dataset-repository";
import { PreferenceStore } from "./core/store";
import { ReferenceSearcher } from "./core/search";
import { ReferenceUpdater } from "./services/updater";
import { Dataset, ReferenceIndexItem } from "./types";

const datasetRepository = new DatasetRepository();
const preferenceStore = new PreferenceStore();
const updater = new ReferenceUpdater(datasetRepository);

const AUTO_UPDATE_INTERVAL_DAYS = 7;
const ALL_CATEGORIES = "all";

function isDatasetStale(generatedAt: string): boolean {
  const generated = new Date(generatedAt).getTime();
  if (isNaN(generated)) return false;
  return (
    Date.now() - generated > AUTO_UPDATE_INTERVAL_DAYS * 24 * 60 * 60 * 1000
  );
}

function formatUpdateAge(generatedAt: string): string {
  const ageMs = Date.now() - new Date(generatedAt).getTime();
  if (isNaN(ageMs) || ageMs < 0) return "";
  const days = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  if (days === 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  return `Updated ${days} days ago`;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);
  const [data, setData] = useState<Dataset | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const autoUpdateTriggered = useRef(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let dataset = await datasetRepository.load();

      if (!dataset) {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: "Downloading references...",
          message: "First time setup",
        });

        try {
          dataset = await updater.update();
          toast.style = Toast.Style.Success;
          toast.title = "References downloaded";
          toast.message = `${dataset.meta.total} cheat sheets loaded`;
        } catch (downloadError) {
          toast.style = Toast.Style.Failure;
          toast.title = "Download failed";
          toast.message =
            downloadError instanceof Error
              ? downloadError.message
              : "Unknown error";
          return;
        }
      }

      const [savedFavorites, savedRecents] = await Promise.all([
        preferenceStore.getFavorites(),
        preferenceStore.getRecents(),
      ]);
      setFavorites(savedFavorites);
      setRecents(savedRecents);
      setData(dataset);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load references",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-update stale data in the background
  useEffect(() => {
    if (!data || autoUpdateTriggered.current) return;
    if (!isDatasetStale(data.meta.generatedAt)) return;

    autoUpdateTriggered.current = true;
    updater
      .update()
      .then((updated) => {
        showToast({
          style: Toast.Style.Success,
          title: "References auto-updated",
          message: `${updated.meta.total} cheat sheets`,
        });
        setData(updated);
      })
      .catch(() => {
        // Silently ignore background update failures - cached data still works
      });
  }, [data]);

  const searcher = useMemo(
    () => (data ? new ReferenceSearcher(data.index) : undefined),
    [data],
  );

  const results = useMemo(
    () => (searcher ? searcher.search(query) : []),
    [searcher, query],
  );

  const handleToggleFavorite = async (id: string) => {
    const isNowFavorite = await preferenceStore.toggleFavorite(id);
    setFavorites((current) => {
      const next = new Set(current);
      if (isNowFavorite) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    await showToast({
      style: Toast.Style.Success,
      title: isNowFavorite ? "Added to favorites" : "Removed from favorites",
    });
  };

  const handleOpen = async (id: string) => {
    await preferenceStore.addRecent(id);
    setRecents(await preferenceStore.getRecents());
  };

  const handleUpdate = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating references...",
    });

    try {
      const dataset = await updater.update();
      toast.style = Toast.Style.Success;
      toast.title = "References updated";
      toast.message = `${dataset.meta.total} cheat sheets`;
      setData(dataset);
    } catch (updateError) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update failed";
      toast.message =
        updateError instanceof Error ? updateError.message : "Unknown error";
    }
  };

  const content = data?.content ?? {};
  const index = useMemo(() => data?.index ?? [], [data?.index]);

  const matchesCategory = useCallback(
    (item: ReferenceIndexItem) =>
      selectedCategory === ALL_CATEGORIES || item.category === selectedCategory,
    [selectedCategory],
  );

  const categories = useMemo(() => {
    const cats = new Set(index.map((item) => item.category));
    return Array.from(cats).sort();
  }, [index]);

  const searchPlaceholder = useMemo(() => {
    const base = "Search cheat sheets, tags, or commands";
    if (!data?.meta.generatedAt) return base;
    const age = formatUpdateAge(data.meta.generatedAt);
    return age ? `${base} · ${age}` : base;
  }, [data?.meta.generatedAt]);

  const favoriteItems = useMemo(() => {
    if (!query && favorites.size > 0) {
      return index.filter(
        (item) => favorites.has(item.id) && matchesCategory(item),
      );
    }
    return [];
  }, [index, favorites, query, matchesCategory]);

  const recentItems = useMemo(() => {
    if (!query && recents.length > 0) {
      return recents
        .filter((id) => !favorites.has(id))
        .map((id) => index.find((item) => item.id === id))
        .filter(
          (item): item is ReferenceIndexItem =>
            item !== undefined && matchesCategory(item),
        )
        .slice(0, 5);
    }
    return [];
  }, [index, recents, favorites, query, matchesCategory]);

  const mainResults = useMemo(() => {
    const filtered = results.filter(({ item }) => matchesCategory(item));
    if (!query) {
      const excludeIds = new Set([
        ...Array.from(favorites),
        ...recentItems.map((item) => item.id),
      ]);
      return filtered.filter(({ item }) => !excludeIds.has(item.id));
    }
    return filtered;
  }, [results, favorites, recentItems, query, matchesCategory]);

  const hasVisibleItems =
    favoriteItems.length > 0 ||
    recentItems.length > 0 ||
    mainResults.length > 0;

  const renderItem = (item: ReferenceIndexItem, isFavorite: boolean) => {
    const detailMarkdown = content[item.id] ?? "_No content found_";
    return (
      <List.Item
        key={item.id}
        title={item.title}
        accessories={buildAccessories(item, isFavorite, recents)}
        actions={
          <ReferenceActionPanel
            entry={item}
            isFavorite={isFavorite}
            onToggleFavorite={() => handleToggleFavorite(item.id)}
            onOpen={() => handleOpen(item.id)}
            onUpdate={handleUpdate}
            detailTarget={
              <ReferenceDetail
                entry={item}
                markdown={detailMarkdown}
                isFavorite={isFavorite}
                onToggleFavorite={() => handleToggleFavorite(item.id)}
                onUpdate={handleUpdate}
              />
            }
          />
        }
      />
    );
  };

  if (!isLoading && !data) {
    return (
      <List>
        <List.EmptyView
          title="Failed to load references"
          description="Please check your internet connection and try again"
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.RotateClockwise}
                onAction={loadData}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={searchPlaceholder}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Category"
          value={selectedCategory}
          onChange={setSelectedCategory}
        >
          <List.Dropdown.Item title="All Categories" value={ALL_CATEGORIES} />
          <List.Dropdown.Section title="Categories">
            {categories.map((cat) => (
              <List.Dropdown.Item key={cat} title={cat} value={cat} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      enableFiltering={false}
    >
      {isLoading && !data && (
        <List.EmptyView
          icon={Icon.Download}
          title="Downloading references..."
          description="First time setup — fetching cheat sheets from GitHub"
        />
      )}

      {!isLoading && !hasVisibleItems && data && (
        <List.EmptyView
          title="No matches"
          description="Try different keywords or change the category filter"
        />
      )}

      {favoriteItems.length > 0 && (
        <List.Section title="Favorites">
          {favoriteItems.map((item) => renderItem(item, true))}
        </List.Section>
      )}

      {recentItems.length > 0 && (
        <List.Section title="Recent">
          {recentItems.map((item) => renderItem(item, favorites.has(item.id)))}
        </List.Section>
      )}

      {query
        ? mainResults.map(({ item }) =>
            renderItem(item, favorites.has(item.id)),
          )
        : mainResults.length > 0 && (
            <List.Section title="All References">
              {mainResults.map(({ item }) =>
                renderItem(item, favorites.has(item.id)),
              )}
            </List.Section>
          )}
    </List>
  );
}

function buildAccessories(
  item: ReferenceIndexItem,
  isFavorite: boolean,
  recents: string[],
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (isFavorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  } else if (recents.includes(item.id)) {
    accessories.push({ icon: Icon.Clock });
  }

  accessories.push({
    tag: { value: item.category, color: Color.SecondaryText },
  });

  if (item.tags.length > 0) {
    accessories.push({
      tag: {
        value: item.tags[0],
        color: Color.Blue,
      },
    });
  }

  return accessories;
}
