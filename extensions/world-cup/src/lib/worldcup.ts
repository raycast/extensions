import { LocalStorage } from "@raycast/api";
import flags from "../flags";
import type { Goal, Match, Player, Team } from "../types";

export type { Goal, Match, Player, Team };

export const FIFA_BASE_URL = "https://api.fifa.com/api/v3";
export const FIFA_SEASON_ID = "285023";
export const FIFA_MATCH_COUNT = 104;
export const FIFA_COMPETITION = "FIFA World Cup 2026";

const GOALS_KEY = "goalsEnabled";

export type MatchState = "pre" | "in" | "post";
export type MatchSide = "home" | "away";
export type MatchStatusFilter = "all" | "upcoming" | "live" | "finished";
export type CountryMatchMode = "any" | "all";

export type LiveMatchData = {
  MatchTime?: string | null;
  HomeTeam?: Team;
  AwayTeam?: Team;
};

export type TeamReference = {
  code: string;
  id?: string;
  name: string;
};

type MatchesResponse = {
  Results?: Match[];
};

const COUNTRY_ALIASES: Record<string, string> = {
  america: "USA",
  "cote d ivoire": "CIV",
  "cote divoire": "CIV",
  "congo dr": "COD",
  "democratic republic of congo": "COD",
  "dr congo": "COD",
  drc: "COD",
  "ivory coast": "CIV",
  "south korea": "KOR",
  "the us": "USA",
  "the usa": "USA",
  turkey: "TUR",
  turkiye: "TUR",
  "u s": "USA",
  "u s a": "USA",
  "united states": "USA",
  "united states of america": "USA",
  us: "USA",
};

/** Whether goal notifications are on. Defaults to true until the user toggles it off. */
export async function goalsEnabled(): Promise<boolean> {
  const v = await LocalStorage.getItem<string>(GOALS_KEY);
  return v == null ? true : v === "true";
}

export async function setGoalsEnabled(on: boolean): Promise<void> {
  await LocalStorage.setItem(GOALS_KEY, String(on));
}

export async function getMatches(): Promise<Match[]> {
  const data = await fetchJson<MatchesResponse>(
    `${FIFA_BASE_URL}/calendar/matches?language=en&count=${FIFA_MATCH_COUNT}&idSeason=${FIFA_SEASON_ID}`,
  );

  return [...(data.Results ?? [])].sort((a, b) => new Date(a.Date).getTime() - new Date(b.Date).getTime());
}

export async function getMatchLiveData(match: Pick<Match, "IdCompetition" | "IdSeason" | "IdStage" | "IdMatch">) {
  return fetchJson<LiveMatchData>(
    `${FIFA_BASE_URL}/live/football/${match.IdCompetition}/${match.IdSeason}/${match.IdStage}/${match.IdMatch}`,
  );
}

export function getMatchCenterUrl(match: Pick<Match, "IdCompetition" | "IdSeason" | "IdStage" | "IdMatch">): string {
  return `https://www.fifa.com/fifaplus/en/match-centre/match/${match.IdCompetition}/${match.IdSeason}/${match.IdStage}/${match.IdMatch}`;
}

/** The currently in-progress match, if any. */
export function liveMatch(matches: Match[]): Match | undefined {
  return matches.find((m) => matchState(m) === "in");
}

export function matchState(match: Match): MatchState {
  if (match.MatchStatus === 0) return "post";
  if (match.MatchStatus === 3) return "in";
  return "pre";
}

export function isUpcomingMatch(match: Match): boolean {
  return matchState(match) === "pre";
}

export function isFinishedMatch(match: Match): boolean {
  return matchState(match) === "post";
}

export function isLiveMatch(match: Match): boolean {
  return matchState(match) === "in";
}

export function matchScore(match: Match): { home: number | null; away: number | null } {
  return {
    home: match.HomeTeamScore ?? match.Home?.Score ?? null,
    away: match.AwayTeamScore ?? match.Away?.Score ?? null,
  };
}

export function teamCode(team: Team | null | undefined): string {
  return team?.Abbreviation || team?.IdCountry || "";
}

export function teamName(team: Team | null | undefined): string {
  return team?.TeamName?.[0]?.Description || team?.ShortClubName || teamCode(team) || "TBD";
}

export function teamFlag(teamOrCode: Team | string | null | undefined): string {
  const code = typeof teamOrCode === "string" ? teamOrCode : teamCode(teamOrCode);
  return flags[code.toUpperCase()] ?? "⚽";
}

export function teamLabel(team: Team | null | undefined, style: "code" | "name" = "code"): string {
  if (!team) return "TBD";
  const code = teamCode(team);
  const label = style === "name" ? teamName(team) : code || teamName(team);
  return `${teamFlag(team)} ${label}`;
}

export function matchStage(match: Match): string {
  return match.GroupName[0]?.Description || match.StageName[0]?.Description || "";
}

export function matchVenue(match: Match): string {
  const stadium = match.Stadium?.Name?.[0]?.Description;
  const city = match.Stadium?.CityName?.[0]?.Description;
  return [stadium, city].filter(Boolean).join(", ");
}

/** Dropdown/subtitle line: "🇲🇽 MEX 2-0 RSA 🇿🇦 · Finished" */
export function formatLine(match: Match): string {
  const home = teamLabel(match.Home);
  const away = teamLabel(match.Away);
  const state = matchState(match);

  if (state === "pre") return `${home} v ${away} · ${kickoff(match.Date)}`;

  const score = formatScore(match);
  const detail = state === "in" ? match.MatchTime || "Live" : "Finished";
  return `${home} ${score} ${away} · ${detail}`;
}

/** Compact menu-bar title: "🇲🇽 2-0 🇿🇦" */
export function menuBarTitle(match: Match): string {
  const score = matchScore(match);
  return `${teamFlag(match.Home)} ${score.home ?? 0}-${score.away ?? 0} ${teamFlag(match.Away)}`;
}

/**
 * HUD string for a goal. Celebratory by default, but sad when the goal is
 * scored against the user's country.
 */
export function goalHud(match: Match, scorerCode: string, country: string): string {
  const myCountry = country.toUpperCase();
  const home = teamCode(match.Home);
  const away = teamCode(match.Away);
  const involvesMe = !!myCountry && (home === myCountry || away === myCountry);
  const against = involvesMe && scorerCode !== myCountry;
  const mark = against ? "😭" : "🎉";

  return `⚽ ${teamFlag(scorerCode)} GOAL!!! ${teamFlag(scorerCode)} ${mark}`;
}

export function filterMatches(
  matches: Match[],
  options: {
    countries?: string[];
    mode?: CountryMatchMode;
    status?: MatchStatusFilter;
  },
): { matches: Match[]; resolvedCountries: TeamReference[]; unresolvedCountries: string[] } {
  const countries = options.countries?.filter(Boolean) ?? [];
  const resolvedCountries: TeamReference[] = [];
  const unresolvedCountries: string[] = [];

  for (const country of countries) {
    const resolved = resolveCountry(country, matches);
    if (resolved) {
      resolvedCountries.push(resolved);
    } else {
      unresolvedCountries.push(country);
    }
  }

  const uniqueCountries = uniqueBy(resolvedCountries, (country) => country.code);
  const mode = options.mode ?? (uniqueCountries.length > 1 ? "all" : "any");
  const status = options.status ?? "all";

  return {
    matches: matches
      .filter((match) => statusMatches(match, status))
      .filter((match) => {
        if (uniqueCountries.length === 0) return true;
        const matchCodes = new Set([teamCode(match.Home), teamCode(match.Away)].filter(Boolean));

        if (mode === "all") return uniqueCountries.every((country) => matchCodes.has(country.code));
        return uniqueCountries.some((country) => matchCodes.has(country.code));
      }),
    resolvedCountries: uniqueCountries,
    unresolvedCountries,
  };
}

export function resolveCountry(input: string, matches: Match[]): TeamReference | undefined {
  const normalizedInput = normalizeCountry(input);
  const alias = COUNTRY_ALIASES[normalizedInput];
  const teams = uniqueBy(
    matches.flatMap((match) => [teamReference(match.Home), teamReference(match.Away)]).filter(isTeamReference),
    "code",
  );
  const lookup = new Map<string, TeamReference>();

  for (const team of teams) {
    lookup.set(normalizeCountry(team.code), team);
    lookup.set(normalizeCountry(team.name), team);
    if (team.id) lookup.set(normalizeCountry(team.id), team);
  }

  if (alias) return lookup.get(normalizeCountry(alias)) ?? { code: alias, name: alias };

  const exact = lookup.get(normalizedInput);
  if (exact) return exact;

  const fuzzy = teams.filter((team) => {
    const normalizedName = normalizeCountry(team.name);
    return normalizedName.includes(normalizedInput) || normalizedInput.includes(normalizedName);
  });

  return fuzzy.length === 1 ? fuzzy[0] : undefined;
}

export function getTeamGoals(team: Team | null | undefined): Goal[] {
  return team?.Goals?.filter((goal) => goal.IdTeam === team.IdTeam) ?? [];
}

export function getPlayerName(team: Team | null | undefined, playerId: string): string {
  return team?.Players?.find((p: Player) => p.IdPlayer === playerId)?.PlayerName[0]?.Description || playerId;
}

export function sideTeam(match: Match, side: MatchSide): Team | null {
  return side === "home" ? match.Home : match.Away;
}

function statusMatches(match: Match, status: MatchStatusFilter): boolean {
  if (status === "all") return true;
  if (status === "upcoming") return isUpcomingMatch(match);
  if (status === "live") return isLiveMatch(match);
  return isFinishedMatch(match);
}

function teamReference(team: Team | null | undefined): TeamReference | undefined {
  const code = teamCode(team);
  if (!code) return undefined;

  return {
    code,
    id: team?.IdTeam,
    name: teamName(team),
  };
}

function isTeamReference(team: TeamReference | undefined): team is TeamReference {
  return Boolean(team);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FIFA API responded ${res.status}`);
  return (await res.json()) as T;
}

function formatScore(match: Match): string {
  const score = matchScore(match);
  return `${score.home ?? 0}-${score.away ?? 0}`;
}

function kickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function normalizeCountry(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueBy<T>(items: T[], key: keyof T | ((item: T) => string)): T[] {
  const getKey = typeof key === "function" ? key : (item: T) => String(item[key]);
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const itemKey = getKey(item);
    if (!itemKey || seen.has(itemKey)) continue;

    seen.add(itemKey);
    unique.push(item);
  }

  return unique;
}
