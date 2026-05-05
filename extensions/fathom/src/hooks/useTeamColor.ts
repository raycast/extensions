import { getTeamColor } from "../utils/teamColors";

/**
 * Custom hook to get team color using deterministic hash-based selection
 * No API calls required - purely client-side and instant
 *
 * @param teamName - The name of the team to get color for
 * @returns The team color hex string or undefined if no team name
 */
export function useTeamColor(teamName: string | null | undefined): string | undefined {
  // Simply return the hash-based color - no async needed!
  return getTeamColor(teamName);
}
