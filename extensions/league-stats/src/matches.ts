import { GAME_TYPES, GameType } from "./gametypes";
import type { KV } from "./kv";
import { MAX_MATCHES, SlimMatch, slimMatch } from "./match";
import type { Platform } from "./regions";
import { RiotApi, RiotError } from "./riot";

/** Bump when SlimMatch changes shape so stale cache entries are ignored. */
const SLIM_VERSION = 1;

export interface RecentMatches {
  matches: SlimMatch[];
  /** Matches that could not be loaded, e.g. because of rate limiting. */
  failed: number;
  reason?: string;
  /** The list came back full, so older games probably exist. False once Riot has nothing more (or at its limit). */
  hasMore: boolean;
}

/** A finished match never changes, so a cached copy never needs to be refetched. */
export async function loadMatch(api: RiotApi, kv: KV, matchId: string): Promise<SlimMatch> {
  const key = `match:${SLIM_VERSION}:${matchId}`;
  const hit = kv.get(key);
  if (hit) {
    try {
      return JSON.parse(hit) as SlimMatch;
    } catch {
      // Corrupt entry: fall through and fetch it again.
    }
  }
  const match = slimMatch(await api.match(matchId));
  kv.set(key, JSON.stringify(match));
  return match;
}

export async function loadRecentMatches(
  api: RiotApi,
  kv: KV,
  puuid: string,
  platform: Platform,
  count: number,
  gameType: GameType = "all",
): Promise<RecentMatches> {
  const ids = await api.matchIds(puuid, platform, count, GAME_TYPES[gameType].filter);
  const settled = await Promise.allSettled(ids.map((id) => loadMatch(api, kv, id)));

  const matches: SlimMatch[] = [];
  let firstError: unknown;
  for (const result of settled) {
    if (result.status === "fulfilled") matches.push(result.value);
    else firstError ??= result.reason;
  }

  // Nothing loaded at all: this is a real failure (bad key, outage), not a partial result.
  if (ids.length > 0 && matches.length === 0) throw firstError;

  return {
    matches,
    failed: ids.length - matches.length,
    reason: firstError instanceof RiotError ? firstError.message : undefined,
    hasMore: ids.length >= count && count < MAX_MATCHES,
  };
}
