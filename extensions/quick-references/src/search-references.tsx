import { Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { ReferenceActionPanel } from "./components/reference-actions";
import { ReferenceDetail } from "./components/reference-detail";
import { DatasetRepository } from "./core/dataset-repository";
import { ReferenceSearcher } from "./core/search";
import { PreferenceStore } from "./core/store";
import { ReferenceUpdater } from "./services/updater";
import { Dataset, ReferenceIndexItem } from "./types";

const datasetRepository = new DatasetRepository();
const preferenceStore = new PreferenceStore();
const updater = new ReferenceUpdater();

export default function Command() {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);
  const [data, setData] = useState<Dataset | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        let dataset = await datasetRepository.load();

        // First load: fetch from live
        if (!dataset) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Downloading references...",
            message: "First time setup",
          });
          try {
            dataset = await updater.update();
            await showToast({
              style: Toast.Style.Success,
              title: "References downloaded",
              message: `${dataset.meta.total} cheat sheets available`,
            });
          } catch (err) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Download failed",
              message: err instanceof Error ? err.message : "Unknown error",
            });
            setIsLoading(false);
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
    }

    loadData();
  }, []);

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

  const content = data?.content ?? {};

  // Separate favorites from other results when not searching
  const favoriteItems = useMemo(() => {
    if (query.trim().length > 0 || !data) return [];
    return data.index.filter((item: ReferenceIndexItem) => favorites.has(item.id));
  }, [data, favorites, query]);

  const otherResults = useMemo((): ReferenceIndexItem[] => {
    if (query.trim().length > 0) {
      // When searching, show all results (including favorites)
      return results.map((r) => r.item);
    }
    // When not searching, exclude favorites from main list
    return results.map((r) => r.item).filter((item: ReferenceIndexItem) => !favorites.has(item.id));
  }, [results, favorites, query]);

  const renderItem = (item: ReferenceIndexItem) => {
    const isFavorite = favorites.has(item.id);
    const detailMarkdown = content[item.id] ?? "_No content found_";

    return (
      <List.Item
        key={item.id}
        title={item.title}
        subtitle={item.category}
        accessories={buildAccessories(item, isFavorite, recents)}
        actions={
          <ReferenceActionPanel
            entry={item}
            isFavorite={isFavorite}
            onToggleFavorite={() => handleToggleFavorite(item.id)}
            onOpen={() => handleOpen(item.id)}
            detailTarget={
              <ReferenceDetail
                entry={item}
                markdown={detailMarkdown}
                isFavorite={isFavorite}
                onToggleFavorite={() => handleToggleFavorite(item.id)}
              />
            }
          />
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cheat sheets, tags, or commands"
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      enableFiltering={false}
    >
      {!isLoading && !data && (
        <List.EmptyView
          title="No data available"
          description="Run 'Update References' to download cheat sheets"
        />
      )}
      {!isLoading && data && results.length === 0 && (
        <List.EmptyView
          title="No matches"
          description="Try different keywords or tags"
        />
      )}

      {favoriteItems.length > 0 && (
        <List.Section title="Favorites">
          {favoriteItems.map((item: ReferenceIndexItem) => renderItem(item))}
        </List.Section>
      )}

      {otherResults.length > 0 && (
        <List.Section
          title={favoriteItems.length > 0 ? "All References" : undefined}
        >
          {otherResults.map((item: ReferenceIndexItem) => renderItem(item))}
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

  if (item.tags.length > 0) {
    accessories.push({
      tag: {
        value: item.tags[0],
        color: Color.SecondaryText,
      },
    });
  }

  return accessories;
}
