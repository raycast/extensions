import { getTeamsMap } from './get-team-list';
import type { SimplifiedTeamOptions, SimplifiedTeam } from '../types';

/**
 * Get team detail from team name.
 * Return null if it cannot find a team matching the given team name.
 */
export function getTeamDetail(teamName: string, options?: SimplifiedTeamOptions): SimplifiedTeam | null {
  const teams = getTeamsMap(options);

  const foundTeam = teams.get(teamName.toLowerCase());
  return foundTeam ?? null;
}
