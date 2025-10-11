import fs from "fs";
import type { FC, ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { environment } from "@raycast/api";
import type { Character, CharacterSection } from "@/types";
import { getFilteredDataset } from "@/lib/dataset-manager";
import { buildList } from "@/lib/list";
import { useItemList } from "@/hooks/use-item-list";

const html = JSON.parse(fs.readFileSync(`${environment.assetsPath}/html.json`, "utf-8")) as {
  html_entities: { code: number; value: string }[];
};

// Create a Map for O(1) lookup instead of O(n) find operations
const htmlEntitiesMap = new Map(html.html_entities.map((entity) => [entity.code, entity.value]));

interface IListContext {
  list: CharacterSection[];
  loading: boolean;
  filter: string | null;
  addToRecentlyUsedItems: (item: Character) => void;
  onSearchTextChange: (text: string) => void;
  clearRecentlyUsedItems: () => void;
  removeFromRecentlyUsedItems: (item: Character) => void;
  isRecentlyUsed: (item: Character) => boolean;
  availableSets: string[];
  setDatasetFilterAnd: (filter: string | null) => void;
  findHtmlEntity: (code: number) => string | null;
  // Favorites functionality
  addToFavorites: (item: Character) => void;
  removeFromFavorites: (item: Character) => void;
  clearFavorites: () => void;
  isFavorite: (item: Character) => boolean;
}

export const ListContext = createContext<IListContext>(null as unknown as IListContext);

export const useListContext = () => useContext(ListContext);

export const ListContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [datasetFilter, setDatasetFilter] = useState<string | null>(null);
  const [dataset, setDataset] = useState(getFilteredDataset(null, datasetFilter));
  const searchTextRef = useRef("");

  function onSearchTextChange(text: string) {
    searchTextRef.current = text;
    setDataset(getFilteredDataset(text, datasetFilter));
  }

  function setDatasetFilterAnd(filter: string | null) {
    setDatasetFilter(filter);
    const text = searchTextRef.current;
    setDataset(getFilteredDataset(text, filter));
  }

  const {
    items: recentlyUsedItems,
    addItem: addToRecentlyUsedItems,
    areItemsLoaded: areRecentlyUsedItemsLoaded,
    clearItems: clearRecentlyUsedItems,
    removeItem: removeFromRecentlyUsedItems,
  } = useItemList<Character>({
    key: "recently-used-v2",
    comparator: "c",
    limit: 10,
  });

  const {
    items: favorites,
    addItem: addToFavorites,
    removeItem: removeFromFavorites,
    clearItems: clearFavorites,
    isInList: isFavorite,
    areItemsLoaded: areFavoritesLoaded,
  } = useItemList<Character>({
    key: "favorites-v1",
    comparator: "c",
    limit: 50,
  });

  const isRecentlyUsed = useCallback(
    (item: Character) => recentlyUsedItems.some((i) => i.c === item.c),
    [recentlyUsedItems],
  );

  const findHtmlEntity = useCallback((code: number) => {
    return htmlEntitiesMap.get(code) || null;
  }, []);

  const list = useMemo(
    () =>
      !areRecentlyUsedItemsLoaded || !areFavoritesLoaded
        ? []
        : buildList(dataset, recentlyUsedItems, !searchTextRef.current, datasetFilter, favorites),
    [dataset, recentlyUsedItems, areRecentlyUsedItemsLoaded, areFavoritesLoaded, datasetFilter, favorites],
  );
  const loading = !addToRecentlyUsedItems || !list.length;
  const availableSets = useMemo(
    () =>
      dataset.blocks
        .map((block) => block.blockName)
        .filter((s) => s !== "Recently Used")
        .sort((a, b) => a.localeCompare(b)),
    [list],
  );

  return (
    <ListContext.Provider
      value={{
        list,
        loading,
        filter: datasetFilter,
        addToRecentlyUsedItems,
        onSearchTextChange,
        clearRecentlyUsedItems,
        isRecentlyUsed,
        removeFromRecentlyUsedItems,
        availableSets,
        setDatasetFilterAnd,
        findHtmlEntity,
        addToFavorites,
        removeFromFavorites,
        clearFavorites,
        isFavorite,
      }}
    >
      {children}
    </ListContext.Provider>
  );
};
