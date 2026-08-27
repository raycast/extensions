import { getPreferenceValues } from "@raycast/api";

export const BASE_URL = "https://parlay-api.com";

export function getApiKey(): string | undefined {
  // `Preferences` is the global type Raycast generates from package.json into
  // raycast-env.d.ts. Declaring a local copy shadowed it and would drift the
  // moment a preference is added or renamed in the manifest.
  const { apiKey } = getPreferenceValues<Preferences>();
  const trimmed = apiKey?.trim();
  return trimmed ? trimmed : undefined;
}

/** Format an American price integer with an explicit sign, e.g. 195 -> "+195". */
export function formatAmerican(price: number): string {
  return price > 0 ? `+${price}` : `${price}`;
}

/** Loosely normalize a team name for matching between endpoints. */
export function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export interface SearchResult {
  type: string;
  sport_key: string;
  sport_title: string;
  home_team: string;
  away_team: string;
  commence_time?: string;
  player?: string;
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
}

export interface GameHit {
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}

/** Dedupe raw search results into one row per matchup, keeping the best commence_time we saw. */
export function dedupeGames(results: SearchResult[]): GameHit[] {
  const byKey = new Map<string, GameHit>();
  for (const r of results) {
    if (r.type !== "game" || !r.home_team || !r.away_team) continue;
    // The search index returns several alias rows per matchup (short and long team names).
    // Prefer long names: keep the row whose home team name is longest.
    const key = `${r.sport_key}|${normalizeTeam(r.home_team).slice(0, 6)}|${normalizeTeam(r.away_team).slice(0, 6)}`;
    const commence = parseCommence(r.commence_time);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        sportKey: r.sport_key,
        sportTitle: r.sport_title,
        homeTeam: r.home_team,
        awayTeam: r.away_team,
        commenceTime: commence,
      });
    } else {
      if (r.home_team.length > existing.homeTeam.length) {
        existing.homeTeam = r.home_team;
        existing.awayTeam = r.away_team;
      }
      if (!existing.commenceTime && commence) existing.commenceTime = commence;
    }
  }
  return Array.from(byKey.values());
}

function parseCommence(value?: string): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export interface BookQuote {
  bookmaker: string;
  price: number;
  age_s: number;
}

export interface BestSide {
  bookmaker: string;
  price: number;
  age_s: number;
  range_cents: number;
  alternatives: BookQuote[];
}

export interface CommandCenterGame {
  event_id: string;
  sport_key: string;
  sport_title: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  book_count: number;
  best_home: BestSide;
  best_away: BestSide;
  max_gap_cents: number;
}

export interface CommandCenterResponse {
  as_of_ms: number;
  games: CommandCenterGame[];
}

export interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

export interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

export interface OddsBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: OddsMarket[];
}

export interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}
