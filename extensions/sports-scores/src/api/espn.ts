import { ScoreboardResponse, Game, GameSummary } from '../types';

const BASE_URL = 'http://site.api.espn.com/apis/site/v2/sports';

export const LEAGUES = [
  { name: 'NFL', sport: 'football', league: 'nfl' },
  { name: 'NBA', sport: 'basketball', league: 'nba' },
  { name: 'MLB', sport: 'baseball', league: 'mlb' },
  { name: 'NHL', sport: 'hockey', league: 'nhl' },
  { name: 'CFB', sport: 'football', league: 'college-football' },
  { name: 'CBB', sport: 'basketball', league: 'mens-college-basketball' },
  { name: 'Soccer (EPL)', sport: 'soccer', league: 'eng.1' },
];

export interface ScoreboardOptions {
  date?: string; // YYYYMMDD format
  dateRange?: string; // YYYYMMDD-YYYYMMDD format
  week?: number; // For football
  seasonType?: number; // For football (1=pre, 2=regular, 3=post)
  season?: number; // Year (for week queries)
}

// Simple cache to prevent redundant API calls
interface CacheEntry {
  data: Game[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_DURATION = 30000; // 30 seconds

function getCacheKey(
  sport: string,
  league: string,
  team?: string,
  options?: ScoreboardOptions,
): string {
  return JSON.stringify({ sport, league, team, options });
}

function getCachedData(key: string): Game[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  // Clean up expired entry
  if (entry) {
    cache.delete(key);
  }
  return null;
}

function setCachedData(key: string, data: Game[]): void {
  cache.set(key, { data, timestamp: Date.now() });

  // Limit cache size to prevent memory leaks
  if (cache.size > 50) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

export async function getScoreboard(
  sport: string,
  league: string,
  team?: string,
  options?: ScoreboardOptions,
): Promise<Game[]> {
  // Check cache first
  const cacheKey = getCacheKey(sport, league, team, options);
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  let url = `${BASE_URL}/${sport}/${league}/scoreboard`;

  // Build query parameters based on options
  const params = new URLSearchParams();

  if (options) {
    // Week-based query for football
    if (options.week !== undefined && options.season && options.seasonType) {
      params.append('dates', String(options.season));
      params.append('seasontype', String(options.seasonType));
      params.append('week', String(options.week));
    }
    // Date range query
    else if (options.dateRange) {
      params.append('dates', options.dateRange);
    }
    // Single date query
    else if (options.date) {
      params.append('dates', options.date);
    }
  }

  // Append query string if params exist
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch scores: ${response.statusText}`);
    }

    const data = (await response.json()) as ScoreboardResponse;
    let games = data.events || [];

    if (team) {
      const teamLower = team.toLowerCase();
      games = games.filter((game) =>
        game.competitions[0].competitors.some(
          (comp) =>
            comp.team.displayName.toLowerCase().includes(teamLower) ||
            comp.team.abbreviation.toLowerCase().includes(teamLower),
        ),
      );
    }

    // Cache the results
    setCachedData(cacheKey, games);

    return games;
  } catch (error) {
    console.error('Error fetching scoreboard:', error);
    return [];
  }
}

export async function getGameSummary(
  sport: string,
  league: string,
  gameId: string,
): Promise<GameSummary | null> {
  const url = `${BASE_URL}/${sport}/${league}/summary?event=${gameId}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch summary: ${response.statusText}`);
    }
    return (await response.json()) as GameSummary;
  } catch (error) {
    console.error('Error fetching game summary:', error);
    return null;
  }
}
