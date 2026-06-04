import type { FavoroLink } from "./favoro";

/**
 * Standard async state pattern
 */
export interface AsyncState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Search hook return type
 */
export interface UseSearchResult extends AsyncState<FavoroLink[]> {
  search: (query: string) => void;
  revalidate: () => void;
}

/**
 * Auth hook return type
 */
export interface UseAuthResult {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | undefined;
  authorize: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}
