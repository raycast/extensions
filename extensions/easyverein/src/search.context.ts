import { createContext, useContext } from "react";
import { MenuItem } from "./shared/registry";

export interface SearchContextValue {
  resolveUrl: (item: MenuItem) => string | null;
  openItem: (item: MenuItem, url: string | null) => Promise<void>;
  reloadRecent: () => void;
}

export const SearchContext = createContext<SearchContextValue | null>(null);

/** Reads the search command context; only valid below its provider. */
export function useSearchContext(): SearchContextValue {
  const value = useContext(SearchContext);
  if (!value) {
    throw new Error("useSearchContext outside of SearchContext");
  }
  return value;
}
