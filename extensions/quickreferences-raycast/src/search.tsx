import {
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { ReferenceActionPanel } from "./components/reference-actions";
import { ReferenceDetail } from "./components/reference-detail";
import { DatasetRepository } from "./core/dataset-repository";
import { PreferenceStore } from "./core/store";
import { ReferenceSearcher } from "./core/search";
import { ReferenceIndexItem } from "./types";

const datasetRepository = new DatasetRepository();
const preferenceStore = new PreferenceStore();

export default function Command() {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);

  const { data, isLoading, error } = useCachedPromise(async () => {
    const dataset = await datasetRepository.load();
    const [savedFavorites, savedRecents] = await Promise.all([
      preferenceStore.getFavorites(),
      preferenceStore.getRecents(),
    ]);
    setFavorites(savedFavorites);
    setRecents(savedRecents);
    return dataset;
  }, []);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load references",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [error]);

  const searcher = useMemo(
    () => (data ? new ReferenceSearcher(data.index) : undefined),
    [data]
  );

  const results = useMemo(
    () => (searcher ? searcher.search(query) : []),
    [searcher, query]
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cheat sheets, tags, or commands"
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      enableFiltering={false}
    >
      {!isLoading && results.length === 0 && (
        <List.EmptyView title="No matches" description="Try different keywords or tags" />
      )}
      {results.map(({ item }) => {
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
      })}
    </List>
  );
}

function buildAccessories(
  item: ReferenceIndexItem,
  isFavorite: boolean,
  recents: string[]
): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];
  if (isFavorite) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  } else if (recents.includes(item.id)) {
    accessories.push({ icon: Icon.Clock });
  }

  accessories.push({ text: item.category });

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
