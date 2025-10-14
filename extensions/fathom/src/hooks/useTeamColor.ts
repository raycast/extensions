import { useCachedPromise } from "@raycast/utils";
import { getTeamColor } from "../utils/teamColors";

/**
 * Custom hook to fetch team color with built-in error handling
 * Gracefully handles rate limits and API failures by returning undefined
 *
 * @param teamName - The name of the team to fetch color for
 * @returns The team color hex string or undefined if unavailable
 */
export function useTeamColor(teamName: string | null | undefined): string | undefined {
  const { data: teamColor } = useCachedPromise(
    async (name: string | null | undefined) => {
      if (!name) return undefined;
      try {
        return await getTeamColor(name);
      } catch (error) {
        // Silently fail - team colors are cosmetic and non-critical
        console.warn("Failed to fetch team color:", error);
        return undefined;
      }
    },
    [teamName],
    {
      initialData: undefined,
      keepPreviousData: true,
      onError: (error) => {
        // Log but don't show error to user - team colors are non-critical
        console.warn("Team color fetch error:", error);
      },
    },
  );

  return teamColor;
}
