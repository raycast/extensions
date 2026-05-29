import { LocalStorage } from "@raycast/api";
import { canonicalCwd } from "./servers";
import { DevServer } from "./types";

export const STORAGE_KEY = "recent-projects";
const MAX_RECENTS = 30;

// Cap on the size of a favicon data URI we persist onto a recent entry.
// The live dashboard always renders the real favicon regardless; this only
// bounds what we cache for the picker's stopped-project icons, so a handful
// of fat multi-resolution .ico files can't bloat LocalStorage. Anything over
// the cap falls back to the framework-tinted folder in the picker.
const MAX_FAVICON_BYTES = 24 * 1024;

export interface RecentProject {
  cwd: string; // canonical path (realpath-resolved)
  projectName: string;
  branch?: string;
  // Cached favicon data URI, populated by the dashboard whenever it
  // successfully resolves one for a running server. Lets the picker
  // render the project's real icon even when the server is stopped.
  favicon?: string;
  lastSeen: number; // unix ms
}

async function readAll(): Promise<RecentProject[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr: unknown = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (r): r is RecentProject =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as RecentProject).cwd === "string" &&
        typeof (r as RecentProject).projectName === "string" &&
        typeof (r as RecentProject).lastSeen === "number",
    );
  } catch {
    return [];
  }
}

async function writeAll(recents: RecentProject[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(recents));
}

// Convenience: project payload for recordSeen from a running DevServer.
export function toRecent(s: DevServer): Omit<RecentProject, "lastSeen"> {
  return {
    cwd: s.cwd,
    projectName: s.projectName,
    branch: s.branch,
  };
}

// Insert-or-refresh a batch of projects in one storage write. The dashboard's
// refresh loop calls this on every poll, so coalescing avoids 1+N writes per
// tick. Bounded LRU: oldest entries beyond MAX_RECENTS are dropped.
//
// Every write also runs a passive migration: existing entries are
// re-keyed by their canonical (symlink-resolved) cwd, collapsing
// duplicates that earlier code paths may have inserted with non-canonical
// paths. An empty `projects` array is a valid call shape; callers can
// use it to force a one-shot migration without recording anything new.
export async function recordSeenBatch(
  projects: Array<Omit<RecentProject, "lastSeen">>,
): Promise<void> {
  const recents = await readAll();
  const byCwd = new Map<string, RecentProject>();
  for (const r of recents) {
    const canon = canonicalCwd(r.cwd);
    const existing = byCwd.get(canon);
    if (!existing || r.lastSeen > existing.lastSeen) {
      byCwd.set(canon, { ...r, cwd: canon });
    }
  }
  const now = Date.now();
  for (const proj of projects) {
    const canon = canonicalCwd(proj.cwd);
    const existing = byCwd.get(canon);
    byCwd.set(canon, {
      ...(existing ?? {}),
      ...proj,
      cwd: canon,
      lastSeen: now,
    });
  }
  const next = [...byCwd.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  if (next.length > MAX_RECENTS) next.length = MAX_RECENTS;
  await writeAll(next);
}

export async function recordSeen(
  proj: Omit<RecentProject, "lastSeen">,
): Promise<void> {
  await recordSeenBatch([proj]);
}

// Remove a single recent by cwd. Reads the current list fresh from storage
// (rather than filtering a caller-held snapshot) so a concurrent writer —
// the dashboard's recordSeenBatch poll, or this command's own mount-time
// migration — isn't clobbered: we only ever drop the one targeted entry and
// preserve everything else as it stands on disk. Returns the resulting list
// so a useLocalStorage caller can sync its in-memory state with the same
// value we just wrote, keeping hook and storage in agreement.
export async function removeRecent(cwd: string): Promise<RecentProject[]> {
  const target = canonicalCwd(cwd);
  const next = (await readAll()).filter((r) => canonicalCwd(r.cwd) !== target);
  await writeAll(next);
  return next;
}

// Attach a favicon to the recent entry matching the given cwd, no-op if
// no matching entry exists yet (the next recordSeen will add one). Skips
// the write when the favicon is already up to date so the dashboard's
// per-render effect doesn't thrash storage.
export async function updateRecentFavicon(
  cwd: string,
  favicon: string,
): Promise<void> {
  // Don't persist oversized favicons; they'd accumulate across up to
  // MAX_RECENTS entries and bloat LocalStorage for a purely cosmetic icon.
  // The dashboard still shows the real favicon live; the picker just falls
  // back to the framework-tinted folder for this project when stopped.
  if (favicon.length > MAX_FAVICON_BYTES) return;
  const target = canonicalCwd(cwd);
  const recents = await readAll();
  let changed = false;
  for (const r of recents) {
    if (canonicalCwd(r.cwd) !== target) continue;
    if (r.favicon === favicon) continue;
    r.favicon = favicon;
    r.cwd = target;
    changed = true;
  }
  if (changed) await writeAll(recents);
}
