import { Color, Image, LocalStorage } from "@raycast/api";
import { fetchBrazilElections, fetchBrazilPresident } from "./sources/brazil-tse";
import type { ElectionSnapshot, ElectionSummary } from "./sources/types";

// Shared by the commands: the election list, loading, phases, the ballot-box icon and dates.

// The list of elections changes rarely, so it's kept for a few hours.
const LIST_KEY = "elections";
const LIST_TTL_MS = 6 * 60 * 60 * 1000;
const FOLLOWED_KEY = "followed-election";

// Every election, newest first.
export async function listElections(): Promise<ElectionSummary[]> {
  const saved = await LocalStorage.getItem<string>(LIST_KEY);
  const cached: { at: number; elections: ElectionSummary[] } | undefined = saved ? JSON.parse(saved) : undefined;
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.elections;
  const elections = (await fetchBrazilElections()).sort((a, b) => Date.parse(b.pollsOpen) - Date.parse(a.pollsOpen));
  await LocalStorage.setItem(LIST_KEY, JSON.stringify({ at: Date.now(), elections }));
  return elections;
}

// The election the menu bar follows: the one picked in Browse Elections, or the newest.
export async function followedElection(): Promise<ElectionSummary | undefined> {
  const [elections, followedId] = await Promise.all([listElections(), LocalStorage.getItem<string>(FOLLOWED_KEY)]);
  return elections.find((election) => election.id === followedId) ?? elections[0];
}

export async function followElection(id: string) {
  await LocalStorage.setItem(FOLLOWED_KEY, id);
}

// Raycast wakes the menu bar every minute (the manifest's interval), but it only goes to the
// network while there can be news: from shortly before the count starts until the count is done.
const FETCH_BEFORE_COUNT_MS = 10 * 60 * 1000;
// With no results this long after the polls close, something is wrong upstream.
export const LATE_AFTER_MS = 3 * 60 * 60 * 1000;

export type Phase = "scheduled" | "voting" | "awaiting-count" | "late" | "counting" | "counted" | "decided";

export function phaseOf(snapshot: ElectionSnapshot, now = Date.now()): Phase {
  if (snapshot.candidates.some((candidate) => candidate.elected)) return "decided";
  // A finished count with no winner, like a first round that goes to a runoff.
  if (snapshot.finished) return "counted";
  if (snapshot.reportingPercent > 0) return "counting";
  if (snapshot.pollsOpen && now < Date.parse(snapshot.pollsOpen)) return "scheduled";
  if (snapshot.pollsClose && now < Date.parse(snapshot.pollsClose)) return "voting";
  if (snapshot.pollsClose && now > Date.parse(snapshot.pollsClose) + LATE_AFTER_MS) return "late";
  return "awaiting-count";
}

export function showsVotes(phase: Phase): boolean {
  return phase === "counting" || phase === "counted" || phase === "decided";
}

// Whether the saved snapshot can still change: false before the count is near, and once it's done.
// A winner can be declared before the count ends, so only a finished count stops the fetching.
function needsFetch(snapshot: ElectionSnapshot, now = Date.now()): boolean {
  if (snapshot.finished) return false;
  if (snapshot.pollsClose && now < Date.parse(snapshot.pollsClose) - FETCH_BEFORE_COUNT_MS) return false;
  return true;
}

const cacheKey = (id: string) => `snapshot:${id}`;

export async function loadSnapshot(election: ElectionSummary): Promise<ElectionSnapshot> {
  const saved = await LocalStorage.getItem<string>(cacheKey(election.id));
  const cached: ElectionSnapshot | undefined = saved ? JSON.parse(saved) : undefined;
  if (cached && !needsFetch(cached)) return cached;
  const fresh = await fetchBrazilPresident(election);
  await LocalStorage.setItem(cacheKey(election.id), JSON.stringify(fresh));
  return fresh;
}

// Drop the saved snapshot and list, so the next load goes to the network whatever the schedule says.
export async function forgetSnapshot(id: string) {
  await Promise.all([LocalStorage.removeItem(cacheKey(id)), LocalStorage.removeItem(LIST_KEY)]);
}

// One ballot-box icon: empty before the count, half full in the leader's color while counting,
// full in the winner's color when done, orange when the results are late.
export function ballotIcon(snapshot: ElectionSnapshot, phase: Phase): Image.ImageLike {
  const leader = snapshot.candidates[0];
  switch (phase) {
    case "scheduled":
    case "voting":
    case "awaiting-count":
      return { source: "ballot-empty.svg", tintColor: Color.PrimaryText };
    case "late":
      return { source: "ballot-empty.svg", tintColor: Color.Orange };
    case "counting":
      return { source: "ballot-half.svg", tintColor: leader.color };
    case "counted":
    case "decided":
      return { source: "ballot-full.svg", tintColor: leader.color };
  }
}

function formatTime(iso: string, timeZone?: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

// Every date uses this one format: "Sun, Oct 25, 17:00 Brasília (Mon, Oct 26, 05:00 your time)".
export function whenText(iso: string, snapshot: ElectionSnapshot): string {
  const there = `${formatTime(iso, snapshot.timeZone)} ${snapshot.timeZoneLabel}`;
  const sameZone = Intl.DateTimeFormat().resolvedOptions().timeZone === snapshot.timeZone;
  return sameZone ? there : `${there} (${formatTime(iso)} your time)`;
}

export function statusText(snapshot: ElectionSnapshot, phase: Phase): string {
  const leader = snapshot.candidates[0];
  switch (phase) {
    case "scheduled":
      return snapshot.pollsOpen ? `Polls open ${whenText(snapshot.pollsOpen, snapshot)}` : "Voting hasn't started";
    case "voting":
      return snapshot.pollsClose ? `Voting until ${whenText(snapshot.pollsClose, snapshot)}` : "Voting";
    case "awaiting-count":
      return "Polls closed. Waiting for the first results";
    case "late":
      return "No results yet, 3 hours after the polls closed";
    case "counting":
      return `${leader.shortName} leads · ${snapshot.reportingPercent.toFixed(2)}% counted`;
    case "counted":
      return `Count finished · ${leader.shortName} first, no winner yet`;
    case "decided":
      return `${leader.shortName} wins`;
  }
}

// The schedule lines both commands show under the candidates.
export function scheduleLines(snapshot: ElectionSnapshot, phase: Phase): { key: string; title: string }[] {
  const lines: { key: string; title: string }[] = [];
  if (snapshot.pollsOpen && phase !== "scheduled" && phase !== "voting") {
    lines.push({ key: "opened", title: `Polls opened ${whenText(snapshot.pollsOpen, snapshot)}` });
  }
  if (snapshot.pollsClose && (phase === "scheduled" || phase === "voting")) {
    lines.push({ key: "count", title: `Count starts ${whenText(snapshot.pollsClose, snapshot)}` });
  }
  lines.push({ key: "updated", title: `TSE updated ${whenText(snapshot.updatedAt, snapshot)}` });
  return lines;
}
