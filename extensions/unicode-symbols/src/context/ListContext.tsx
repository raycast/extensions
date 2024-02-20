import type { FC, ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// import { clearSearchBar } from "@raycast/api";
import type { Character } from "@/lib/dataset-manager";
import { getFilteredDataset } from "@/lib/dataset-manager";
import { useRecentlyUsedItems } from "@/lib/use-recently-used-items";
import type { CharacterSet } from "@/utils/list";
import { buildList } from "@/utils/list";

interface IListContext {
  list: CharacterSet[];
  loading: boolean;
  addToRecentlyUsedItems: (item: Character) => void;
  onSearchTextChange: (text: string) => void;
  clearRecentlyUsedItems: () => void;
  removeFromRecentlyUsedItems: (item: Character) => void;
  isRecentlyUsed: (item: Character) => boolean;
  availableSets: string[];
  setDatasetFilterAnd: (filter: string | null) => void;
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
    key: "recently-used",
    comparator: "code",
  });

  const isRecentlyUsed = useCallback(
    (item: Character) => recentlyUsedItems.some((i) => i.code === item.code),
    [recentlyUsedItems],
  );

  const list = useMemo(
    () =>
      !areRecentlyUsedItemsLoaded ? [] : buildList(dataset, recentlyUsedItems, !searchTextRef.current, datasetFilter),
    [dataset, recentlyUsedItems, areRecentlyUsedItemsLoaded, datasetFilter],
  );
  const loading = !addToRecentlyUsedItems || !list.length;
  const availableSets = useMemo(
    () =>
      list
        .map((set) => set.sectionTitle)
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
      }}
    >
      {children}
    </ListContext.Provider>
  );
};
