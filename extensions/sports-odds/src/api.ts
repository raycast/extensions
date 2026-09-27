import { getPreferenceValues } from "@raycast/api";
import { TEAM_ALIASES } from "./team-aliases";

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

/** Exact spelling normalization, also used for the explicit alias lookup. */
export function normalizeTeam(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const aliasesBySport = new Map(
  Object.entries(TEAM_ALIASES).map(([sport, teams]) => [
    sport,
    new Map(
      teams.flatMap(([canonical, ...aliases]) =>
        [canonical, ...aliases].map((alias) => [normalizeTeam(alias), canonical] as const),
      ),
    ),
  ]),
);

export function canonicalTeam(name: string, sportKey: string): string {
  return aliasesBySport.get(sportKey)?.get(normalizeTeam(name)) ?? name;
}

function teamIdentity(name: string, sportKey: string): string {
  return normalizeTeam(canonicalTeam(name, sportKey));
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
  key: string;
  sportKey: string;
  sportTitle: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime?: Date;
}

/** Alias rows are one event only when sport, both teams and kickoff agree. */
export function dedupeGames(results: SearchResult[]): GameHit[] {
  const byKey = new Map<string, GameHit>();
  for (const r of results) {
    if (r.type !== "game" || !r.home_team || !r.away_team) continue;
    const commence = parseCommence(r.commence_time);
    const key = JSON.stringify([
      r.sport_key,
      teamIdentity(r.home_team, r.sport_key),
      teamIdentity(r.away_team, r.sport_key),
      commence?.toISOString() ?? r.commence_time ?? null,
    ]);
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        sportKey: r.sport_key,
        sportTitle: r.sport_title,
        homeTeam: canonicalTeam(r.home_team, r.sport_key),
        awayTeam: canonicalTeam(r.away_team, r.sport_key),
        commenceTime: commence,
      });
    }
  }
  return Array.from(byKey.values());
}

function parseCommence(value?: string): Date | undefined {
  if (!value) return undefined;
  const iso = value.trim().replace(" ", "T");
  // API timestamps without an offset are UTC, independent of the user's zone.
  const zoned = iso.includes("T") && !/(Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso + "Z" : iso;
  const d = new Date(zoned);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** The keyless and own-key views must resolve the same selected fixture. */
export function findEvent<T extends { sport_key: string; home_team: string; away_team: string; commence_time: string }>(
  events: T[],
  target: GameHit,
): T | undefined {
  const home = teamIdentity(target.homeTeam, target.sportKey);
  const away = teamIdentity(target.awayTeam, target.sportKey);
  if (!home || !away) return undefined;
  const matches = events.filter(
    (event) =>
      event.sport_key === target.sportKey &&
      teamIdentity(event.home_team ?? "", event.sport_key) === home &&
      teamIdentity(event.away_team ?? "", event.sport_key) === away &&
      (!target.commenceTime || parseCommence(event.commence_time)?.getTime() === target.commenceTime.getTime()),
  );
  // An undated search hit cannot choose arbitrarily between repeat fixtures.
  return matches.length === 1 ? matches[0] : undefined;
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
