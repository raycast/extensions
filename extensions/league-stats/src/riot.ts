import { Cluster, Platform, accountCluster, clusterOf, isPlatform, platformOfMatchId } from "./regions";

export type RiotErrorKind = "auth" | "not-found" | "rate-limit" | "http" | "network";

export class RiotError extends Error {
  constructor(
    readonly kind: RiotErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RiotError";
  }
}

export interface AccountDto {
  puuid: string;
  gameName?: string;
  tagLine?: string;
}

export interface SummonerDto {
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface LeagueEntryDto {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak?: boolean;
}

export interface RawParticipant {
  puuid: string;
  riotIdGameName?: string;
  riotIdTagline?: string;
  summonerName?: string;
  championId: number;
  championName: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamId: number;
  playerSubteamId?: number;
  placement?: number;
  teamPosition?: string;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  goldEarned?: number;
  totalDamageDealtToChampions?: number;
  totalDamageTaken?: number;
  visionScore?: number;
  summoner1Id: number;
  summoner2Id: number;
  largestMultiKill?: number;
  gameEndedInEarlySurrender?: boolean;
  challenges?: { killParticipation?: number };
}

export interface RawMatch {
  metadata: { matchId: string };
  info: {
    gameCreation: number;
    gameStartTimestamp?: number;
    gameEndTimestamp?: number;
    gameDuration: number;
    gameMode: string;
    gameVersion: string;
    platformId: string;
    queueId: number;
    endOfGameResult?: string;
    participants: RawParticipant[];
    teams?: { teamId: number; objectives?: Record<string, { kills: number }> }[];
  };
}

/** Server-side filters of the match id list: one exact queue, or a match type. */
export interface MatchFilter {
  queue?: number;
  type?: "ranked" | "normal";
}

/** Stay under the 20 requests/second application limit of a development key. */
const REQUEST_GAP_MS = 55;
/** Rate-limit waits longer than this are reported instead of freezing the UI. */
const MAX_WAIT_MS = 10_000;
const TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 3;

let nextSlot = 0;
let blockedUntil = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function waitForSlot() {
  const now = Date.now();
  const start = Math.max(now, nextSlot, blockedUntil);
  nextSlot = start + REQUEST_GAP_MS;
  if (start > now) await sleep(start - now);
}

function rateLimited(seconds: number) {
  return new RiotError("rate-limit", `Riot is rate limiting this API key. Try again in ${seconds}s.`, 429);
}

export class RiotApi {
  constructor(private readonly apiKey: string) {}

  private async get<T>(host: Cluster | Platform, path: string): Promise<T> {
    const url = `https://${host}.api.riotgames.com${path}`;

    for (let attempt = 1; ; attempt++) {
      const blockedFor = blockedUntil - Date.now();
      if (blockedFor > MAX_WAIT_MS) throw rateLimited(Math.ceil(blockedFor / 1000));
      await waitForSlot();

      let res: Response;
      try {
        res = await fetch(url, {
          headers: { "X-Riot-Token": this.apiKey, Accept: "application/json" },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch {
        if (attempt < MAX_ATTEMPTS) {
          await sleep(300 * attempt);
          continue;
        }
        throw new RiotError("network", "Could not reach the Riot API. Check your internet connection.");
      }

      if (res.ok) return (await res.json()) as T;

      if (res.status === 401 || res.status === 403) {
        throw new RiotError("auth", "Riot rejected the API key: it is expired, invalid, or not allowed.", res.status);
      }
      if (res.status === 404) throw new RiotError("not-found", "Not found.", 404);
      if (res.status === 429) {
        const seconds = Math.max(1, Number(res.headers.get("Retry-After")) || 1);
        // Every queued request waits out the same penalty.
        blockedUntil = Math.max(blockedUntil, Date.now() + seconds * 1000);
        if (attempt < MAX_ATTEMPTS && seconds * 1000 <= MAX_WAIT_MS) continue;
        throw rateLimited(seconds);
      }
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(400 * attempt);
        continue;
      }
      throw new RiotError("http", `Riot API returned ${res.status}.`, res.status);
    }
  }

  accountByRiotId(gameName: string, tagLine: string, hint: Platform) {
    const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    return this.get<AccountDto>(accountCluster(hint), path);
  }

  accountByPuuid(puuid: string, hint: Platform) {
    return this.get<AccountDto>(accountCluster(hint), `/riot/account/v1/accounts/by-puuid/${puuid}`);
  }

  /** The platform a player is currently active on, or undefined when Riot reports one we do not know. */
  async activeRegion(puuid: string, hint: Platform): Promise<Platform | undefined> {
    const dto = await this.get<{ region: string }>(
      accountCluster(hint),
      `/riot/account/v1/region/by-game/lol/by-puuid/${puuid}`,
    );
    const region = dto.region.toLowerCase();
    return isPlatform(region) ? region : undefined;
  }

  summoner(puuid: string, platform: Platform) {
    return this.get<SummonerDto>(platform, `/lol/summoner/v4/summoners/by-puuid/${puuid}`);
  }

  leagueEntries(puuid: string, platform: Platform) {
    return this.get<LeagueEntryDto[]>(platform, `/lol/league/v4/entries/by-puuid/${puuid}`);
  }

  matchIds(puuid: string, platform: Platform, count: number, filter: MatchFilter = {}) {
    const query = new URLSearchParams({ start: "0", count: String(count) });
    if (filter.queue !== undefined) query.set("queue", String(filter.queue));
    if (filter.type) query.set("type", filter.type);
    return this.get<string[]>(clusterOf(platform), `/lol/match/v5/matches/by-puuid/${puuid}/ids?${query}`);
  }

  match(matchId: string) {
    const platform = platformOfMatchId(matchId);
    if (!platform) throw new RiotError("http", `Unrecognized match ID: ${matchId}`);
    return this.get<RawMatch>(clusterOf(platform), `/lol/match/v5/matches/${matchId}`);
  }
}
