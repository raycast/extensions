import { LocalStorage } from "@raycast/api";
import { canPlanStart, canonicalCwd } from "./servers";
import { DevServer } from "./types";

export const STORAGE_KEY = "recent-projects";
const MAX_RECENTS = 30;

// Cap on the size of a favicon data URI we persist onto a recent entry.
// The live dashboard always renders the real favicon regardless; this only
// bounds what we cache for stopped-project icons (the picker and the menu bar),
// so a handful of fat multi-resolution .ico files can't bloat LocalStorage.
// Anything over the cap falls back to the framework-tinted folder/dot. Sized to
// admit a typical 180×180 apple-touch-icon PNG, which the menu bar relies on.
const MAX_FAVICON_BYTES = 48 * 1024;

export interface RecentProject {
  cwd: string; // canonical path (realpath-resolved)
  projectName: string;
  branch?: string;
  // Framework/tool tag (vite, next, shopify-theme, …) captured while the
  // project was running. Used to tint the fallback icon when no favicon is
  // cached. Optional: picker-recorded and pre-upgrade entries won't have it
  // until the dashboard sees the project running again.
  tool?: string;
  // Cached favicon data URI (best available, SVG allowed), populated by the
  // dashboard whenever it resolves one for a running server. Lets the picker
  // render the project's real icon even when the server is stopped.
  favicon?: string;
  // Raster-only variant (PNG/ICO) of the favicon, for the menu bar — it renders
  // SVG images as a black template, so it can't use `favicon` when that's an
  // SVG. Falls back to the framework-tinted dot when absent.
  faviconRaster?: string;
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

// Every writer here reads the whole list, changes it, and writes it back. The
// dashboard runs several of them at once (the poll's recordSeenBatch and one
// favicon write per row), and two that interleave lose whichever wrote first:
// a favicon write that read the list just before the poll added a project put
// the old list back, and the project was gone until something saw it running
// again. Queueing them one behind another within a command closes that. It
// cannot order writes made by two different commands, but those are rare and
// each one re-reads storage first, so the window is one storage round trip.
let writeQueue: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(work, work);
  writeQueue = run.catch(() => {});
  return run;
}

// How stale a project's lastSeen may get before a poll that sees it running
// again bothers to write. The dashboard polls every few seconds (every second
// while a start is in flight) and the list carries favicons as data URIs, so
// rewriting all of it on every tick only to move timestamps along was megabytes
// of storage traffic a minute. A minute of drift is invisible in a list
// ordered by "recently".
const LAST_SEEN_RESOLUTION_MS = 60_000;

// Convenience: project payload for recordSeen from a running DevServer.
export function toRecent(s: DevServer): Omit<RecentProject, "lastSeen"> {
  return {
    cwd: s.cwd,
    projectName: s.projectName,
    branch: s.branch,
    tool: s.tool,
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
export function recordSeenBatch(
  projects: Array<Omit<RecentProject, "lastSeen">>,
): Promise<void> {
  return serialized(() => recordSeenBatchNow(projects));
}

async function recordSeenBatchNow(
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
  // Anything the migration above changed (a duplicate collapsed, a path
  // canonicalized) is worth a write on its own.
  let changed = byCwd.size !== recents.length;
  for (const r of recents) if (!changed && !byCwd.has(r.cwd)) changed = true;
  const now = Date.now();
  for (const proj of projects) {
    const canon = canonicalCwd(proj.cwd);
    const existing = byCwd.get(canon);
    const fresh =
      existing !== undefined &&
      now - existing.lastSeen < LAST_SEEN_RESOLUTION_MS &&
      existing.projectName === proj.projectName &&
      existing.branch === proj.branch &&
      (proj.tool === undefined || existing.tool === proj.tool);
    if (fresh) continue;
    changed = true;
    byCwd.set(canon, {
      ...(existing ?? {}),
      ...proj,
      // A caller that does not know the tool (a start recorded before the
      // server is up) must not erase the one already on file.
      tool: proj.tool ?? existing?.tool,
      cwd: canon,
      lastSeen: now,
    });
  }
  if (!changed) return;
  const next = [...byCwd.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  if (next.length > MAX_RECENTS) next.length = MAX_RECENTS;
  await writeAll(next);
}

// Record the projects behind a set of running servers. Shared by the
// dashboard's poll and the menu bar's refresh: recents used to be fed by the
// dashboard alone, so a project started in a terminal and never seen while the
// dashboard happened to be open never made it into the Start lists at all.
// The menu bar refreshes in the background every minute, which is what makes
// "recently run" mean what it says.
//
// A recent is a promise the Start picker can start it, so a folder with
// nothing to plan from (a `python -m http.server` in ~/Documents, a Rails
// app) is a running server, not a startable project, and stays out.
export function recordRunning(servers: DevServer[]): Promise<void> {
  const byCwd = new Map<string, Omit<RecentProject, "lastSeen">>();
  for (const s of servers) {
    if (!byCwd.has(s.cwd) && canPlanStart(s.cwd)) byCwd.set(s.cwd, toRecent(s));
  }
  if (byCwd.size === 0) return Promise.resolve();
  return recordSeenBatch([...byCwd.values()]);
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
export function removeRecent(cwd: string): Promise<RecentProject[]> {
  return serialized(async () => {
    const target = canonicalCwd(cwd);
    const next = (await readAll()).filter(
      (r) => canonicalCwd(r.cwd) !== target,
    );
    await writeAll(next);
    return next;
  });
}

// Attach a favicon to the recent entry matching the given cwd, no-op if
// no matching entry exists yet (the next recordSeen will add one). Skips
// the write when the favicon is already up to date so the dashboard's
// per-render effect doesn't thrash storage.
export function updateRecentFavicon(
  cwd: string,
  favicons: { favicon?: string; faviconRaster?: string },
): Promise<void> {
  return serialized(() => updateRecentFaviconNow(cwd, favicons));
}

async function updateRecentFaviconNow(
  cwd: string,
  favicons: { favicon?: string; faviconRaster?: string },
): Promise<void> {
  // Don't persist oversized favicons; they'd accumulate across up to
  // MAX_RECENTS entries and bloat LocalStorage for a purely cosmetic icon.
  // The dashboard still shows the real favicon live; the stopped-project icon
  // just falls back to the framework-tinted folder/dot when over the cap.
  const favicon =
    favicons.favicon && favicons.favicon.length <= MAX_FAVICON_BYTES
      ? favicons.favicon
      : undefined;
  const faviconRaster =
    favicons.faviconRaster && favicons.faviconRaster.length <= MAX_FAVICON_BYTES
      ? favicons.faviconRaster
      : undefined;
  if (!favicon && !faviconRaster) return;
  const target = canonicalCwd(cwd);
  const recents = await readAll();
  let changed = false;
  for (const r of recents) {
    if (canonicalCwd(r.cwd) !== target) continue;
    const newFavicon = favicon !== undefined && r.favicon !== favicon;
    const newRaster =
      faviconRaster !== undefined && r.faviconRaster !== faviconRaster;
    if (!newFavicon && !newRaster) continue;
    if (newFavicon) r.favicon = favicon;
    if (newRaster) r.faviconRaster = faviconRaster;
    // Normalize the key while we're writing anyway; reads always compare
    // through canonicalCwd, so this only saves them the realpath.
    r.cwd = target;
    changed = true;
  }
  if (changed) await writeAll(recents);
}
