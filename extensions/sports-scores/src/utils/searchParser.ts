/**
 * Smart search parser for league and team filtering
 */

import { LEAGUES } from '../api/espn';

export interface SearchResult {
  type: 'league' | 'team' | 'combined' | 'none';
  league?: string; // league key in format "sport/league"
  teamQuery?: string; // team filter text
}

/**
 * Parses search query to determine user intent
 * Supports:
 * - League names: "NBA", "NFL", "MLB"
 * - Prefix format: "nba:", "nfl:lakers"
 * - Command mode: ">nba", ">switch nfl"
 * - Team names: "lakers", "celtics" (default)
 */
export function parseSearchQuery(query: string): SearchResult {
  const trimmed = query.trim().toLowerCase();

  // Empty query - show all
  if (!trimmed) {
    return { type: 'none' };
  }

  // Command mode: ">nba" or ">switch nba"
  if (trimmed.startsWith('>')) {
    const cmd = trimmed.slice(1).trim();
    const leagueMatch = cmd.replace(/^switch\s+/, '');
    const league = findLeagueByName(leagueMatch);
    if (league) {
      return {
        type: 'league',
        league: `${league.sport}/${league.league}`,
      };
    }
  }

  // Prefix format: "nba:lakers"
  if (trimmed.includes(':')) {
    const [leaguePart, teamPart] = trimmed.split(':', 2);
    const league = findLeagueByName(leaguePart.trim());
    if (league && teamPart) {
      return {
        type: 'combined',
        league: `${league.sport}/${league.league}`,
        teamQuery: teamPart.trim(),
      };
    }
  }

  // Direct league name: "NBA", "NFL"
  const league = findLeagueByName(trimmed);
  if (league) {
    return {
      type: 'league',
      league: `${league.sport}/${league.league}`,
    };
  }

  // Default to team search
  return {
    type: 'team',
    teamQuery: trimmed,
  };
}

/**
 * Finds a league by name, abbreviation, or partial match
 */
function findLeagueByName(name: string) {
  const lowerName = name.toLowerCase();

  // Try exact match first
  let match = LEAGUES.find(
    (l) => l.name.toLowerCase() === lowerName || l.league.toLowerCase() === lowerName,
  );

  if (match) return match;

  // Try abbreviation/shorthand matches
  const abbreviations: Record<string, (typeof LEAGUES)[number]> = {
    nfl: LEAGUES.find((l) => l.league === 'nfl')!,
    nba: LEAGUES.find((l) => l.league === 'nba')!,
    mlb: LEAGUES.find((l) => l.league === 'mlb')!,
    nhl: LEAGUES.find((l) => l.league === 'nhl')!,
    cfb: LEAGUES.find((l) => l.league === 'college-football')!,
    'college football': LEAGUES.find((l) => l.league === 'college-football')!,
    cbb: LEAGUES.find((l) => l.league === 'mens-college-basketball')!,
    'college basketball': LEAGUES.find((l) => l.league === 'mens-college-basketball')!,
    soccer: LEAGUES.find((l) => l.sport === 'soccer')!,
    epl: LEAGUES.find((l) => l.sport === 'soccer')!,
  };

  match = abbreviations[lowerName];
  if (match) return match;

  // Try partial match as last resort
  match = LEAGUES.find((l) => l.name.toLowerCase().includes(lowerName));

  return match;
}

/**
 * Get search hints based on current query
 */
export function getSearchHints(query: string): string {
  if (!query.trim()) {
    return 'Search by league (NBA, NFL) or team (Lakers, Celtics)';
  }

  const result = parseSearchQuery(query);

  switch (result.type) {
    case 'league':
      return `Showing ${LEAGUES.find((l) => `${l.sport}/${l.league}` === result.league)?.name} games`;
    case 'team':
      return `Filtering teams matching "${result.teamQuery}"`;
    case 'combined':
      return `Showing ${LEAGUES.find((l) => `${l.sport}/${l.league}` === result.league)?.name} teams matching "${result.teamQuery}"`;
    case 'none':
    default:
      return 'Showing all leagues';
  }
}
