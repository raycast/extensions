import { environment, LocalStorage } from "@raycast/api";
import { getAuth, BASE } from "./auth";
import { parseSubmissions, applyActivePhase } from "./parse";
import { DEMO_SUBMISSIONS } from "./demo";
import { Submission } from "../types";

// Submission numbers for which the user currently has an OPEN task — an
// invitation they're invited to whose expdate is in the future (e.g. an active
// rebuttal/review window). This is how OpenReview's Author Console "Tasks" work.
// Best-effort: any failure yields an empty set and the caller keeps the
// review-count heuristic.
async function fetchOpenTaskNumbers(
  profileId: string,
  headers: Record<string, string>,
): Promise<Set<number>> {
  const open = new Set<number>();
  const url =
    `${BASE}/invitations?invitee=${encodeURIComponent(profileId)}` +
    `&type=note&limit=1000`;
  const res = await fetch(url, { headers });
  if (!res.ok) return open;
  const data = (await res.json()) as {
    invitations?: { id: string; expdate?: number }[];
  };
  const now = Date.now();
  for (const inv of data.invitations ?? []) {
    if (typeof inv.expdate !== "number" || inv.expdate <= now) continue; // closed window
    const m = inv.id.match(/\/Submission(\d+)\//);
    if (m) open.add(Number(m[1]));
  }
  return open;
}

export const DEMO_FLAG = "demo-mode";

export async function fetchMySubmissions(): Promise<Submission[]> {
  // Dev-only: serve dummy data for Store screenshots (no login, no real data).
  if (environment.isDevelopment && (await LocalStorage.getItem(DEMO_FLAG))) {
    return DEMO_SUBMISSIONS;
  }
  const { token, profileId } = await getAuth();
  const headers = { Authorization: `Bearer ${token}` };
  const limit = 100;
  let offset = 0;
  const notes: Record<string, unknown>[] = [];
  for (;;) {
    const url =
      `${BASE}/notes?content.authorids=${encodeURIComponent(profileId)}` +
      `&details=directReplies&limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers });
    if (!res.ok)
      throw new Error(`Failed to fetch submissions (${res.status}).`);
    const data = (await res.json()) as {
      notes: Record<string, unknown>[];
      count: number;
    };
    notes.push(...data.notes);
    offset += limit;
    if (notes.length >= data.count || data.notes.length === 0) break;
  }

  const subs = parseSubmissions(notes);

  // Distinguish "actively under review" (open task) from "reviews in, cycle
  // closed". Best-effort — skip silently if the invitations call fails.
  let openTasks = new Set<number>();
  try {
    openTasks = await fetchOpenTaskNumbers(profileId, headers);
  } catch {
    openTasks = new Set();
  }
  for (const s of subs) {
    s.status = applyActivePhase(s.status, openTasks.has(s.number));
  }

  // Newest submission first. cdate is comparable across venues; fall back to
  // submission number only when timestamps are missing/equal.
  return subs.sort((a, b) => b.cdate - a.cdate || b.number - a.number);
}
