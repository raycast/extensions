import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Entity, Preferences } from "../types";

/**
 * Hook for fetching entities
 * Returns a list of entities from the Origami API
 * Handles potential non-array responses from different database configurations
 */
export function useEntities() {
  const preferences = getPreferenceValues<Preferences>();

  const response = useFetch<Entity[] | Record<string, Entity>>(
    `https://${preferences.organization}.origami.ms/entities/api/entities_list/format/json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: preferences.email,
        api_secret: preferences["api-token"],
      }),
    },
  );

  // Transform the response to ensure we always return an array
  return {
    ...response,
    data: Array.isArray(response.data) ? response.data : response.data ? Object.values(response.data) : [],
  };
}
