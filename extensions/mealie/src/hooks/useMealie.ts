import { useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import { createMealieClient, type MealieClient, type MealieConfig } from "../api/client";
import { getSelf } from "../api/meta";
import { getMealieConfig } from "../preferences";

interface UseMealieResult {
  client?: MealieClient;
  config?: MealieConfig;
  configError?: Error;
}

export function useMealie(): UseMealieResult {
  return useMemo(() => {
    try {
      const config = getMealieConfig();
      return { config, client: createMealieClient(config) };
    } catch (error) {
      return { configError: error as Error };
    }
  }, []);
}

/**
 * Der groupSlug steckt in der Rezept-Web-URL. Er wird aus /api/users/self gelesen
 * und gecacht, statt geraten zu werden.
 */
export function useGroupSlug(client?: MealieClient): string | undefined {
  const { data } = useCachedPromise(async () => (await getSelf(client!)).groupSlug, [], {
    execute: client !== undefined,
  });
  return data;
}
