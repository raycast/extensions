import type { RawMatch, RawParticipant } from "./riot";
import { Platform, isPlatform, platformOfMatchId } from "./regions";

/** How many games to load at first, unless the "Games to Load" preference says otherwise. */
export const MATCH_COUNT = 20;
/** Riot returns at most this many match IDs per request. */
export const MAX_MATCHES = 100;

export type Result = "win" | "loss" | "remake";

const OBJECTIVE_KEYS = ["tower", "inhibitor", "dragon", "baron", "riftHerald", "horde", "atakhan"] as const;
export type ObjectiveKey = (typeof OBJECTIVE_KEYS)[number];
export type Objectives = Partial<Record<ObjectiveKey, number>>;

/** The fields we display. A raw match is ~140 KB; this is a few KB, so 20 of them stay cheap to cache. */
export interface SlimParticipant {
  puuid: string;
  gameName: string;
  tagLine: string;
  championId: number;
  championName: string;
  level: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamId: number;
  /** Arena-style modes only. */
  subteamId?: number;
  placement?: number;
  role: string;
  /** Seven slots; 0 means empty. The last one is the trinket. */
  items: number[];
  cs: number;
  gold: number;
  damage: number;
  damageTaken: number;
  vision: number;
  spells: number[];
  /** 0 to 1. */
  killParticipation?: number;
  largestMultiKill: number;
}

export interface SlimMatch {
  id: string;
  platform?: Platform;
  queueId: number;
  mode: string;
  /** Epoch milliseconds. */
  start: number;
  /** Seconds. */
  duration: number;
  version: string;
  remake: boolean;
  participants: SlimParticipant[];
  objectives: Record<number, Objectives>;
}

function slimParticipant(p: RawParticipant): SlimParticipant {
  return {
    puuid: p.puuid,
    gameName: p.riotIdGameName || p.summonerName || "",
    tagLine: p.riotIdTagline ?? "",
    championId: p.championId,
    championName: p.championName,
    level: p.champLevel,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    win: p.win,
    teamId: p.teamId,
    subteamId: p.playerSubteamId || undefined,
    placement: p.placement || undefined,
    role: p.teamPosition ?? "",
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
    cs: (p.totalMinionsKilled ?? 0) + (p.neutralMinionsKilled ?? 0),
    gold: p.goldEarned ?? 0,
    damage: p.totalDamageDealtToChampions ?? 0,
    damageTaken: p.totalDamageTaken ?? 0,
    vision: p.visionScore ?? 0,
    spells: [p.summoner1Id, p.summoner2Id],
    killParticipation: p.challenges?.killParticipation,
    largestMultiKill: p.largestMultiKill ?? 0,
  };
}

export function slimMatch(raw: RawMatch): SlimMatch {
  const { info, metadata } = raw;

  const objectives: Record<number, Objectives> = {};
  for (const team of info.teams ?? []) {
    const counts: Objectives = {};
    for (const key of OBJECTIVE_KEYS) {
      const kills = team.objectives?.[key]?.kills;
      if (kills) counts[key] = kills;
    }
    objectives[team.teamId] = counts;
  }

  const platformId = info.platformId?.toLowerCase();
  // Older matches report gameDuration in milliseconds and have no end timestamp.
  const duration = info.gameEndTimestamp ? info.gameDuration : Math.round(info.gameDuration / 1000);

  return {
    id: metadata.matchId,
    platform: isPlatform(platformId) ? platformId : platformOfMatchId(metadata.matchId),
    queueId: info.queueId,
    mode: info.gameMode,
    start: info.gameStartTimestamp || info.gameCreation,
    duration,
    version: info.gameVersion,
    remake:
      info.participants.some((p) => p.gameEndedInEarlySurrender) || (info.endOfGameResult ?? "").startsWith("Abort"),
    participants: info.participants.map(slimParticipant),
    objectives,
  };
}

export function participantOf(match: SlimMatch, puuid: string): SlimParticipant | undefined {
  return match.participants.find((p) => p.puuid === puuid);
}

export function resultOf(match: SlimMatch, p: SlimParticipant): Result {
  if (match.remake) return "remake";
  return p.win ? "win" : "loss";
}

/** Bots and hidden accounts have no PUUID we can look up. */
export function canOpenPlayer(p: SlimParticipant): boolean {
  return p.puuid !== "" && p.puuid !== "BOT";
}

export function displayName(p: SlimParticipant): string {
  return p.gameName || p.championName;
}

export function riotId(p: SlimParticipant): string | undefined {
  return p.gameName && p.tagLine ? `${p.gameName}#${p.tagLine}` : undefined;
}

export interface ChampionStat {
  championId: number;
  championName: string;
  games: number;
  wins: number;
}

export interface Summary {
  games: number;
  wins: number;
  losses: number;
  remakes: number;
  /** 0 to 1; undefined when no counted games. Remakes are not counted. */
  winRate?: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  kda: number;
  csPerMin: number;
  /** 0 to 1 */
  killParticipation?: number;
  avgDuration: number;
  champions: ChampionStat[];
}

export function summarize(matches: SlimMatch[], puuid: string): Summary {
  let wins = 0;
  let losses = 0;
  let remakes = 0;
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let cs = 0;
  let seconds = 0;
  const participation: number[] = [];
  const champions = new Map<number, ChampionStat>();

  for (const match of matches) {
    const p = participantOf(match, puuid);
    if (!p) continue;
    if (match.remake) {
      remakes++;
      continue;
    }
    if (p.win) wins++;
    else losses++;
    kills += p.kills;
    deaths += p.deaths;
    assists += p.assists;
    cs += p.cs;
    seconds += match.duration;
    if (p.killParticipation !== undefined) participation.push(p.killParticipation);

    const stat = champions.get(p.championId) ?? {
      championId: p.championId,
      championName: p.championName,
      games: 0,
      wins: 0,
    };
    stat.games++;
    if (p.win) stat.wins++;
    champions.set(p.championId, stat);
  }

  const games = wins + losses;
  return {
    games,
    wins,
    losses,
    remakes,
    winRate: games ? wins / games : undefined,
    avgKills: games ? kills / games : 0,
    avgDeaths: games ? deaths / games : 0,
    avgAssists: games ? assists / games : 0,
    kda: (kills + assists) / Math.max(1, deaths),
    csPerMin: seconds ? cs / (seconds / 60) : 0,
    killParticipation: participation.length
      ? participation.reduce((a, b) => a + b, 0) / participation.length
      : undefined,
    avgDuration: games ? seconds / games : 0,
    champions: [...champions.values()].sort((a, b) => b.games - a.games || b.wins - a.wins).slice(0, 5),
  };
}

const ROLE_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

export interface TeamGroup {
  key: string;
  /** "Blue Side", "Red Side", or an Arena placement. */
  label: string;
  win: boolean;
  placement?: number;
  players: SlimParticipant[];
  kills: number;
  gold: number;
  /** Damage dealt to champions, summed over the team. */
  damage: number;
  objectives: Objectives;
}

/** Arena-style modes have many small teams; the blue/red side is meaningless there. */
function usesSubteams(match: SlimMatch): boolean {
  const subteams = new Set(match.participants.map((p) => p.subteamId).filter(Boolean));
  return subteams.size > 2 && match.participants.some((p) => p.placement);
}

export function groupTeams(match: SlimMatch): TeamGroup[] {
  const bySubteam = usesSubteams(match);
  const groups = new Map<number, SlimParticipant[]>();
  for (const p of match.participants) {
    const id = bySubteam ? (p.subteamId ?? 0) : p.teamId;
    groups.set(id, [...(groups.get(id) ?? []), p]);
  }

  const result = [...groups.entries()].map(([id, members]): TeamGroup => {
    const players = bySubteam
      ? members
      : [...members].sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role));
    const placement = bySubteam ? members[0].placement : undefined;
    return {
      key: `${bySubteam ? "sub" : "team"}-${id}`,
      label: bySubteam
        ? `${ordinal(placement ?? 0)} Place`
        : id === 100
          ? "Blue Side"
          : id === 200
            ? "Red Side"
            : `Team ${id}`,
      win: members[0].win,
      placement,
      players,
      kills: members.reduce((sum, p) => sum + p.kills, 0),
      gold: members.reduce((sum, p) => sum + p.gold, 0),
      damage: members.reduce((sum, p) => sum + p.damage, 0),
      objectives: bySubteam ? {} : (match.objectives[id] ?? {}),
    };
  });

  return bySubteam
    ? result.sort((a, b) => (a.placement ?? 99) - (b.placement ?? 99))
    : result.sort((a, b) => a.key.localeCompare(b.key));
}

export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
