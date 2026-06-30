/**
 * Keyless live football data via ESPN's public scoreboard API.
 * Unofficial endpoint — no auth required, but the shape is not guaranteed forever.
 */

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

/** This extension follows the FIFA World Cup 2026 only. */
export const WORLD_CUP_LEAGUE = "fifa.world";
export const WORLD_CUP_TITLE = "FIFA World Cup 2026";

export type EspnEvent = {
  id: string;
  shortName: string;
  date: string;
  status: {
    displayClock: string;
    period: number;
    type: {
      state: "pre" | "in" | "post";
      completed: boolean;
      description: string;
      shortDetail: string;
    };
  };
  competitions?: {
    competitors?: {
      homeAway: "home" | "away";
      team?: { abbreviation?: string; displayName?: string };
      score?: string;
    }[];
  }[];
};

export const scoreboardUrl = (league: string): string => `${BASE}/${league}/scoreboard`;
export const summaryUrl = (league: string, id: string): string => `${BASE}/${league}/summary?event=${id}`;

export type LiveGoal = { minute: string; scorer: string };
export type LiveTeamStat = { abbr: string; possession?: string; shots?: string; shotsOnTarget?: string };
export type LiveStats = { goals: LiveGoal[]; teams: LiveTeamStat[] };

type SummaryResponse = {
  keyEvents?: {
    type?: { text?: string };
    clock?: { displayValue?: string };
    participants?: { athlete?: { displayName?: string } }[];
  }[];
  boxscore?: {
    teams?: { team?: { abbreviation?: string }; statistics?: { name: string; displayValue: string }[] }[];
  };
};

/** Pull live goals + team stats from the match summary. Null on any failure. */
export async function fetchSummary(league: string, id: string): Promise<LiveStats | null> {
  try {
    const res = await fetch(summaryUrl(league, id));
    if (!res.ok) return null;
    const json = (await res.json()) as SummaryResponse;
    const goals: LiveGoal[] = (json.keyEvents ?? [])
      .filter((e) => e.type?.text === "Goal")
      .map((e) => ({ minute: e.clock?.displayValue ?? "", scorer: e.participants?.[0]?.athlete?.displayName ?? "" }))
      .filter((g) => g.scorer);
    const stat = (stats: { name: string; displayValue: string }[] | undefined, name: string) =>
      stats?.find((s) => s.name === name)?.displayValue;
    const teams: LiveTeamStat[] = (json.boxscore?.teams ?? []).map((t) => ({
      abbr: t.team?.abbreviation ?? "?",
      possession: stat(t.statistics, "possessionPct"),
      shots: stat(t.statistics, "totalShots"),
      shotsOnTarget: stat(t.statistics, "shotsOnTarget"),
    }));
    return { goals, teams };
  } catch {
    return null;
  }
}

export async function fetchScoreboard(league: string): Promise<EspnEvent[]> {
  const res = await fetch(scoreboardUrl(league));
  if (!res.ok) throw new Error(`ESPN request failed (${res.status})`);
  const json = (await res.json()) as { events?: EspnEvent[] };
  return json.events ?? [];
}

export async function fetchEvent(league: string, id: string): Promise<EspnEvent | null> {
  const events = await fetchScoreboard(league);
  return events.find((event) => event.id === id) ?? null;
}

/** Pull the leading integer out of a clock like "67'" or "45+2'". Null when unparseable (e.g. "HT"). */
export function minuteFromClock(displayClock: string | undefined): number | null {
  const match = (displayClock ?? "").match(/\d+/);
  return match ? Number(match[0]) : null;
}

export function isHalftime(event: EspnEvent): boolean {
  const { state, description, shortDetail } = event.status.type;
  return state === "in" && /half/i.test(`${description} ${shortDetail}`);
}

/** Kickoff time in the user's local timezone, e.g. "Today 18:00" or "Sat 18:00". */
export function kickoffLocal(dateStr: string, now: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const today = new Date(now);
  const sameDay =
    d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  return sameDay ? `Today ${time}` : `${d.toLocaleDateString([], { weekday: "short" })} ${time}`;
}

export function scoreLine(event: EspnEvent): string | undefined {
  const competitors = event.competitions?.[0]?.competitors;
  if (!competitors || competitors.length < 2) return undefined;
  const home = competitors.find((c) => c.homeAway === "home");
  const away = competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return undefined;
  const name = (c: typeof home) => c?.team?.abbreviation ?? c?.team?.displayName ?? "?";
  return `${name(away)} ${away.score ?? 0} – ${home.score ?? 0} ${name(home)}`;
}
