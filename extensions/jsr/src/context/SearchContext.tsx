import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

type SearchContextValue = {
  /** Push a new Search view scoped to the given JSR scope (e.g. "std"). */
  openScope: (scope: string) => void;
  /** Pre-built jsr.io URL reflecting the current search query, if any. */
  searchQueryURL?: string;
  /** Whether the List detail panel is currently visible. */
  isShowingDetails: boolean;
  /** Flip the detail panel visibility. */
  toggleDetails: () => void;
  /** Extra `Action.*` nodes injected into each row's ActionPanel. */
  extraActions?: ReactNode;
};

const SearchContext = createContext<SearchContextValue | null>(null);

type SearchProviderProps = SearchContextValue & {
  children: ReactNode;
};

/**
 * Provides the shared Search-screen state (navigation + UI flags + injected
 * actions) to the entire subtree so callbacks and view state aren't
 * prop-drilled through StatsSections / ListItem / ItemDetails.
 */
export const SearchProvider = ({
  openScope,
  searchQueryURL,
  isShowingDetails,
  toggleDetails,
  extraActions,
  children,
}: SearchProviderProps) => {
  const value = useMemo<SearchContextValue>(
    () => ({ openScope, searchQueryURL, isShowingDetails, toggleDetails, extraActions }),
    [openScope, searchQueryURL, isShowingDetails, toggleDetails, extraActions],
  );
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
};

/**
 * Read the Search context. Returns `null` if no provider is mounted (used by
 * isolated subviews like `VersionList` pushed via `useNavigation().push`).
 */
export const useSearchContext = (): SearchContextValue | null => {
  return useContext(SearchContext);
};
