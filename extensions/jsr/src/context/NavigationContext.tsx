import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

type NavigationContextValue = {
  /** Push a new Search view scoped to the given JSR scope (e.g. "std"). */
  openScope: (scope: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

type NavigationProviderProps = {
  openScope: (scope: string) => void;
  children: ReactNode;
};

/**
 * Provides navigation actions shared across the Search subtree so callbacks
 * like `openScope` don't have to be prop-drilled through StatsSections /
 * ListItem / ItemDetails.
 */
export const NavigationProvider = ({ openScope, children }: NavigationProviderProps) => {
  const value = useMemo<NavigationContextValue>(() => ({ openScope }), [openScope]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

/**
 * Read the navigation actions from the nearest `NavigationProvider`. Returns
 * `null` if no provider is mounted (used by isolated subviews like
 * `VersionList` pushed via `useNavigation().push`).
 */
export const useNavigationContext = (): NavigationContextValue | null => {
  return useContext(NavigationContext);
};
