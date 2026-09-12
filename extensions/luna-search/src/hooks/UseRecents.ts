import { useEffect, useState } from "react";
import { GameSummary } from "../models";
import { useExpiringCache } from "./UseExpiringCache";
import { MENU_SECTION_CAPACITY } from "../constants";

/**
 * Generates an array of cache keys based on the provided limit.
 * The keys are named "RecentlyOpened_[index]", where the index
 * decreases from the limit - 1 to 0.
 *
 * @param keyCount The number of keys to generate.
 * @returns An array of cache key strings.
 */
const generateKeys = (keyCount: number): string[] => {
  const keys = [];
  for (let i = keyCount - 1; i >= 0; i--) {
    keys.push(`RecentlyOpened_${i}`);
  }
  return keys;
};

/**
 * The time-to-live (TTL) for the cached recently opened games, in seconds.
 * This is set to 7 days (60 seconds * 60 minutes * 24 hours * 7 days).
 */
const TTL_S = 60 * 60 * 24 * 7;

/**
 * A custom React hook that manages the list of recently opened games,
 * using an expiring cache to store the game summaries.
 *
 * @param limit The maximum number of recently opened games to keep track of.
 * @returns A tuple containing the array of recently opened games (or undefined if not available),
 * a boolean indicating whether the data is still loading, and a function to add a new game to the recently opened list.
 */
export function useRecents(
  limit: number = MENU_SECTION_CAPACITY
): [GameSummary[] | undefined, boolean, (game: GameSummary) => Promise<void>] {
  const keys = generateKeys(limit);
  const [cache] = useExpiringCache<GameSummary>(TTL_S);
  const [recents, setRecents] = useState<GameSummary[] | undefined>(undefined);

  useEffect(() => {
    if (!cache) {
      return;
    }

    const cachedRecents = keys.map((key) => cache.get(key)).filter((game) => !!game);
    if (recents && recents.length == 0 && cachedRecents.length == 0) {
      return;
    }
    setRecents(cachedRecents);
  }, [cache]);

  /**
   * Adds a new game to the list of recently opened games.
   * If the game already exists in the list, it is moved to the top.
   * The cache is then updated with the new list of recently opened games.
   *
   * @param game The GameSummary instance to add to the recently opened list.
   */
  const addGame = async (game: GameSummary) => {
    const currentRecents = [...(recents ?? [])];
    const existingIndex = currentRecents.findIndex((recent) => game.title === recent.title);
    if (existingIndex === 0) {
      return;
    }
    if (existingIndex > 0) {
      currentRecents.splice(existingIndex, 1);
    }
    const games = [game, ...(currentRecents ?? []).slice(0, 4)];
    if (cache) {
      games.forEach((game, i) => cache.set(keys[i], game));
    }
    setRecents(games);
  };

  if (!cache) {
    return [undefined, true, addGame];
  }

  return [recents, !recents, addGame];
}
