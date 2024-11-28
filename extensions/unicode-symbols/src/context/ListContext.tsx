import fs from "fs";
import type { FC, ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { environment } from "@raycast/api";

import { getFilteredDataset } from "@/lib/dataset-manager";
import { useRecentlyUsedItems } from "@/lib/use-recently-used-items";
import type { Character, CharacterSection } from "@/types";
import { buildList } from "@/utils/list";

const html = JSON.parse(fs.readFileSync(`${environment.assetsPath}/html.json`, "utf-8")) as {
  html_entities: { code: number; value: string }[];
};

interface IListContext {
  list: CharacterSection[];
  loading: boolean;
  addToRecentlyUsedItems: (item: Character) => void;
  onSearchTextChange: (text: string) => void;
  clearRecentlyUsedItems: () => void;
  removeFromRecentlyUsedItems: (item: Character) => void;
  isRecentlyUsed: (item: Character) => boolean;
  availableSets: string[];
  setDatasetFilterAnd: (filter: string | null) => void;
  findHtmlEntity: (code: number) => string | null;
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
    recentlyUsedItems,
    addToRecentlyUsedItems,
    areRecentlyUsedItemsLoaded,
    clearRecentlyUsedItems,
    removeFromRecentlyUsedItems,
  } = useRecentlyUsedItems<Character>({
    key: "recently-used-v2",
    comparator: "c",
  });

  const isRecentlyUsed = useCallback(
    (item: Character) => recentlyUsedItems.some((i) => i.c === item.c),
    [recentlyUsedItems],
  );

  const findHtmlEntity = useCallback(
    (code: number) => {
      const entity = html.html_entities.find((e) => e.code === code);
      return entity ? entity.value : null;
    },
    [html],
  );

  const list = useMemo(
    () =>
      !areRecentlyUsedItemsLoaded ? [] : buildList(dataset, recentlyUsedItems, !searchTextRef.current, datasetFilter),
    [dataset, recentlyUsedItems, areRecentlyUsedItemsLoaded, datasetFilter],
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
        addToRecentlyUsedItems,
        onSearchTextChange,
        clearRecentlyUsedItems,
        isRecentlyUsed,
        removeFromRecentlyUsedItems,
        availableSets,
        setDatasetFilterAnd,
        findHtmlEntity,
      }}
    >
      {children}
    </ListContext.Provider>
  );
};
