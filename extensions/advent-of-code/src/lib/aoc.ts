import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";
import {
  SubmitStatus,
  isLoggedOut,
  parseCalendarStars,
  parseLeaderboardIds,
  parsePuzzle,
  parseSubmit,
  parseYearStars,
} from "./parse";

const BASE_URL = "https://adventofcode.com";
// Advent of Code asks automated tools to identify themselves
const USER_AGENT = "github.com/raycast/extensions/tree/main/extensions/advent-of-code by rokoodev@gmail.com";
const MINUTE = 60 * 1000;
// The leaderboard JSON should not be requested more than once every 15 minutes
const LEADERBOARD_TTL = 15 * MINUTE;
const PAGE_TTL = 15 * MINUTE;
const EVENTS_TTL = 60 * MINUTE;

type Cookie = string | undefined;

export class SessionError extends Error {
  constructor(message = "Add your session cookie in the extension preferences to use this.") {
    super(message);
    this.name = "SessionError";
  }
}

function session(): Cookie {
  return getPreferenceValues<Preferences>().session?.trim() || undefined;
}

export function hasSession(): boolean {
  return session() !== undefined;
}

export function puzzleUrl(year: number, day: number): string {
  return `${BASE_URL}/${year}/day/${day}`;
}

export function leaderboardUrl(year: number, id: string): string {
  return `${BASE_URL}/${year}/leaderboard/private/view/${id}`;
}

async function request(
  cookie: Cookie,
  path: string,
  init: { method?: string; body?: string; auth?: boolean } = {},
): Promise<string> {
  if (init.auth && !cookie) throw new SessionError();

  const headers: Record<string, string> = { "User-Agent": USER_AGENT };
  if (cookie) headers.Cookie = `session=${cookie}`;
  if (init.body) headers["Content-Type"] = "application/x-www-form-urlencoded";

  const response = await fetch(`${BASE_URL}${path}`, { method: init.method ?? "GET", headers, body: init.body });
  const text = await response.text();

  if (response.status === 400 || response.status === 401 || (init.auth && isLoggedOut(text))) {
    throw new SessionError("Your session cookie is missing or expired. Copy a fresh one from adventofcode.com.");
  }
  if (response.status === 404) throw new Error("This page isn't available yet.");
  if (!response.ok) throw new Error(`Advent of Code returned ${response.status}.`);
  return text;
}

// Each loader takes the cookie first: withCache keys entries by a hash of the arguments, so every account gets its
// own entries and the cookie itself never reaches the disk
const loadPuzzle = withCache(
  async (cookie: Cookie, year: number, day: number) => parsePuzzle(await request(cookie, `/${year}/day/${day}`), day),
  { maxAge: PAGE_TTL },
);

// Inputs never change, so they are cached forever
const loadInput = withCache((cookie: Cookie, year: number, day: number) =>
  request(cookie, `/${year}/day/${day}/input`, { auth: true }),
);

const loadCalendarStars = withCache(
  async (cookie: Cookie, year: number) => parseCalendarStars(await request(cookie, `/${year}`, { auth: true })),
  { maxAge: PAGE_TTL },
);

const loadYearStars = withCache(
  async (cookie: Cookie) => parseYearStars(await request(cookie, "/events", { auth: true })),
  { maxAge: EVENTS_TTL },
);

// An empty list is never served from the cache, so a leaderboard joined a minute ago shows up right away
const loadLeaderboardIds = withCache(
  async (cookie: Cookie, year: number) =>
    parseLeaderboardIds(await request(cookie, `/${year}/leaderboard/private`, { auth: true })),
  { maxAge: EVENTS_TTL, validate: (ids) => ids.length > 0 },
);

const loadLeaderboard = withCache(
  async (cookie: Cookie, year: number, id: string): Promise<Leaderboard> => {
    const json = await request(cookie, `/${year}/leaderboard/private/view/${id}.json`, { auth: true });
    try {
      return JSON.parse(json) as Leaderboard;
    } catch {
      throw new Error("You don't have access to this leaderboard. Check its ID in the preferences.");
    }
  },
  { maxAge: LEADERBOARD_TTL },
);

// Called after a refresh or a right answer, so puzzles and stars are read again
export function forgetPuzzles() {
  loadPuzzle.clearCache();
  loadCalendarStars.clearCache();
  loadYearStars.clearCache();
}

// Puzzles

export type Puzzle = { year: number; day: number; title: string; markdown: string; answers: string[]; stars: number };

export async function getPuzzle(year: number, day: number): Promise<Puzzle> {
  const puzzle = await loadPuzzle(session(), year, day);
  return { year, day, ...puzzle, stars: puzzle.answers.length };
}

export function getInput(year: number, day: number): Promise<string> {
  return loadInput(session(), year, day);
}

export async function submitAnswer(
  year: number,
  day: number,
  part: 1 | 2,
  answer: string,
): Promise<{ status: SubmitStatus; message: string }> {
  const body = new URLSearchParams({ level: String(part), answer: answer.trim() }).toString();
  const html = await request(session(), `/${year}/day/${day}/answer`, { method: "POST", body, auth: true });
  const result = parseSubmit(html);
  if (result.status === "correct") forgetPuzzles();
  return result;
}

// Stars

export async function getCalendarStars(year: number): Promise<Record<number, number>> {
  const cookie = session();
  return cookie ? loadCalendarStars(cookie, year) : {};
}

export async function getYearStars(): Promise<Record<number, number>> {
  const cookie = session();
  return cookie ? loadYearStars(cookie) : {};
}

// Leaderboards

export type StarTime = { get_star_ts: number; star_index: number };

export type Member = {
  id: number;
  name: string | null;
  stars: number;
  local_score: number;
  last_star_ts: number;
  completion_day_level: Record<string, { "1"?: StarTime; "2"?: StarTime }>;
};

export type Leaderboard = { event: string; owner_id: number; members: Record<string, Member> };

export async function getLeaderboardIds(year: number): Promise<string[]> {
  const preferred = getPreferenceValues<Preferences>().leaderboardId?.trim();
  if (preferred) return [preferred];
  const ids = await loadLeaderboardIds(session(), year);
  if (ids.length === 0) {
    throw new Error("You're not on any private leaderboard yet. Join one or set its ID in the preferences.");
  }
  return ids;
}

export function getLeaderboard(year: number, id: string): Promise<Leaderboard> {
  return loadLeaderboard(session(), year, id);
}

export function memberName(member: Member): string {
  return member.name ?? `Anonymous user #${member.id}`;
}
