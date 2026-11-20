import { Cache, getPreferenceValues } from "@raycast/api";
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

const cache = new Cache({ namespace: "advent-of-code" });

export class SessionError extends Error {
  constructor(message = "Add your session cookie in the extension preferences to use this.") {
    super(message);
    this.name = "SessionError";
  }
}

function session(): string | undefined {
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

async function request(path: string, init: { method?: string; body?: string; auth?: boolean } = {}): Promise<string> {
  const cookie = session();
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

// Session-specific responses are cached under a key that includes the cookie, so switching accounts never shows stale data
function cacheKey(key: string): string {
  return `${session()?.slice(-8) ?? "anonymous"}:${key}`;
}

async function cached(key: string, ttl: number, load: () => Promise<string>): Promise<string> {
  const fullKey = cacheKey(key);
  const hit = cache.get(fullKey);
  if (hit) {
    const { at, value } = JSON.parse(hit) as { at: number; value: string };
    if (Date.now() - at < ttl) return value;
  }
  const value = await load();
  cache.set(fullKey, JSON.stringify({ at: Date.now(), value }));
  return value;
}

export function forgetPuzzle(year: number, day: number) {
  cache.remove(cacheKey(`puzzle:${year}:${day}`));
  cache.remove(cacheKey(`calendar:${year}`));
}

// Puzzles

export type Puzzle = { year: number; day: number; title: string; markdown: string; answers: string[]; stars: number };

export async function getPuzzle(year: number, day: number): Promise<Puzzle> {
  const html = await cached(`puzzle:${year}:${day}`, PAGE_TTL, () => request(`/${year}/day/${day}`));
  const puzzle = parsePuzzle(html, day);
  return { year, day, ...puzzle, stars: puzzle.answers.length };
}

export async function getInput(year: number, day: number): Promise<string> {
  // Inputs never change, so they are cached forever
  return cached(`input:${year}:${day}`, Infinity, () => request(`/${year}/day/${day}/input`, { auth: true }));
}

export async function submitAnswer(
  year: number,
  day: number,
  part: 1 | 2,
  answer: string,
): Promise<{ status: SubmitStatus; message: string }> {
  const body = new URLSearchParams({ level: String(part), answer: answer.trim() }).toString();
  const result = parseSubmit(await request(`/${year}/day/${day}/answer`, { method: "POST", body, auth: true }));
  if (result.status === "correct") forgetPuzzle(year, day);
  return result;
}

// Stars

export async function getCalendarStars(year: number): Promise<Record<number, number>> {
  if (!hasSession()) return {};
  return parseCalendarStars(await cached(`calendar:${year}`, PAGE_TTL, () => request(`/${year}`, { auth: true })));
}

export async function getYearStars(): Promise<Record<number, number>> {
  if (!hasSession()) return {};
  return parseYearStars(await cached("events", 60 * MINUTE, () => request("/events", { auth: true })));
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
  const html = await cached(`boards:${year}`, 60 * MINUTE, () =>
    request(`/${year}/leaderboard/private`, { auth: true }),
  );
  const ids = parseLeaderboardIds(html);
  if (ids.length === 0) {
    throw new Error("You're not on any private leaderboard yet. Join one or set its ID in the preferences.");
  }
  return ids;
}

export async function getLeaderboard(year: number, id: string): Promise<Leaderboard> {
  const json = await cached(`leaderboard:${year}:${id}`, LEADERBOARD_TTL, () =>
    request(`/${year}/leaderboard/private/view/${id}.json`, { auth: true }),
  );
  try {
    return JSON.parse(json) as Leaderboard;
  } catch {
    throw new Error("You don't have access to this leaderboard. Check its ID in the preferences.");
  }
}

export function memberName(member: Member): string {
  return member.name ?? `Anonymous user #${member.id}`;
}
