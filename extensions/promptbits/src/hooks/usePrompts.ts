import { useCachedPromise } from "@raycast/utils";
import { fetchPrompts } from "../lib/api";

/**
 * Hook to fetch prompts from PromptBits API
 *
 * Uses stale-while-revalidate caching:
 * - Shows cached data immediately on launch
 * - Fetches fresh data in the background
 * - Cache persists across Raycast sessions
 */
export function usePrompts() {
  return useCachedPromise(fetchPrompts, [], {
    keepPreviousData: true,
  });
}
