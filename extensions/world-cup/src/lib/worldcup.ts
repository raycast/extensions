import { LocalStorage } from "@raycast/api";
import flags from "../flags";

const ENDPOINT = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const GOALS_KEY = "goalsEnabled";

/** Flag emoji for a FIFA tricode, falling back to ⚽ for anything unmapped. */
function flag(tricode: string): string {
  return flags[tricode?.toUpperCase()] ?? "⚽";
}

/** Whether goal notifications are on. Defaults to true until the user toggles it off. */
export async function goalsEnabled(): Promise<boolean> {
  const v = await LocalStorage.getItem<string>(GOALS_KEY);
  return v == null ? true : v === "true";
}

export async function setGoalsEnabled(on: boolean): Promise<void> {
  await LocalStorage.setItem(GOALS_KEY, String(on));
}

export type MatchState = "pre" | "in" | "post";

export interface Match {
  id: string;
  home: string; // abbreviation, e.g. "ESP"
  away: string;
  homeName: string; // full name, e.g. "Spain"
  awayName: string;
  homeScore: string;
  awayScore: string;
  state: MatchState;
  /** Short status: "25'", "HT", "FT", "45'+2'" */
  detail: string;
  /** ISO kickoff time, useful for pre-match items */
  date: string;
}

/**
 * HUD string for a goal. Celebratory ⚽🎉 by default, but ⚽😭 when the goal is
 * scored against the user's country (their team is playing and the *other* side scored).
 */
export function goalHud(m: Match, scorerCode: string, country: string): string {
  const involvesMe = !!country && (m.home === country || m.away === country);
  const against = involvesMe && scorerCode !== country;
  const mark = against ? "😭" : "🎉";
  // No score — that's already in the menu bar. Kept punchy since the HUD only
  // shows for ~1.5s.
  return `⚽ ${flag(scorerCode)} GOAL!!! ${flag(scorerCode)} ${mark}`;
}

export async function getMatches(): Promise<Match[]> {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`ESPN responded ${res.status}`);
  const data = (await res.json()) as { events?: EspnEvent[] };

  return (data.events ?? []).map((e) => {
    const c = e.competitions[0];
    const home = c.competitors.find((t) => t.homeAway === "home") ?? c.competitors[0];
    const away = c.competitors.find((t) => t.homeAway === "away") ?? c.competitors[1];
    return {
      id: e.id,
      home: home.team.abbreviation,
      away: away.team.abbreviation,
      homeName: home.team.displayName,
      awayName: away.team.displayName,
      homeScore: home.score ?? "0",
      awayScore: away.score ?? "0",
      state: c.status.type.state,
      detail: c.status.type.shortDetail,
      date: e.date,
    };
  });
}

/** The currently in-progress match, if any. */
export function liveMatch(matches: Match[]): Match | undefined {
  return matches.find((m) => m.state === "in");
}

/** Dropdown/subtitle line: "🇨🇻 CPV 0–1 ESP 🇪🇸 · 67'" */
export function formatLine(m: Match): string {
  const a = `${flag(m.away)} ${m.away}`;
  const h = `${m.home} ${flag(m.home)}`;
  if (m.state === "pre") return `${a} v ${h} · ${kickoff(m.date)}`;
  return `${a} ${m.awayScore}–${m.homeScore} ${h} · ${m.detail}`;
}

/** Compact menu-bar title — just flags and the score: "🇨🇻 0–1 🇪🇸" */
export function menuBarTitle(m: Match): string {
  return `${flag(m.away)} ${m.awayScore}–${m.homeScore} ${flag(m.home)}`;
}

function kickoff(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// --- ESPN response shapes (only the fields we read) ---
interface EspnEvent {
  id: string;
  date: string;
  competitions: {
    status: { type: { state: MatchState; shortDetail: string } };
    competitors: {
      homeAway: "home" | "away";
      score?: string;
      team: { abbreviation: string; displayName: string };
    }[];
  }[];
}
