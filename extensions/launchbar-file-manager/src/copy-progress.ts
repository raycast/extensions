import { promises as fs } from "node:fs";
import * as nfs from "node:fs";
import * as path from "node:path";
import { Toast } from "@raycast/api";
import { safeTrash } from "./trash-safe";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

export function progressBar(frac: number, width = 16): string {
  const f = Math.max(0, Math.min(1, frac));
  const filled = Math.round(f * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function splitName(base: string): { stem: string; ext: string } {
  const idx = base.lastIndexOf(".");
  // Keep dotfiles like ".gitignore" intact, require stem to be non-empty
  if (idx > 0 && idx < base.length - 1) {
    return { stem: base.slice(0, idx), ext: base.slice(idx) };
  }
  return { stem: base, ext: "" };
}

/**
 * True when anything occupies the path. Uses lstat (not access/stat) so a
 * dangling symlink still counts as occupied — otherwise a planted link to a
 * missing outside file would look like a free name and the later write
 * would follow it out of the destination folder.
 */
async function occupied(p: string): Promise<boolean> {
  try {
    await fs.lstat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Destination that does not collide: "Name", "Name copy", "Name copy 2", …
 * (ext-aware). Names chosen here are reserved in `reserved` so batch plans
 * that pick several destinations up front can never hand out the same name
 * twice (e.g. copying /a/report.txt and /b/report.txt together).
 */
export async function uniqueDest(
  destDir: string,
  baseName: string,
  reserved: Set<string> = new Set(),
): Promise<string> {
  const { stem, ext } = splitName(baseName);
  const candidates = [
    path.join(destDir, baseName),
    path.join(destDir, `${stem} copy${ext}`),
  ];
  let n = 2;
  for (const candidate of candidates) {
    if (!reserved.has(candidate) && !(await occupied(candidate))) {
      reserved.add(candidate);
      return candidate;
    }
  }
  while (true) {
    const candidate = path.join(destDir, `${stem} copy ${n}${ext}`);
    n++;
    if (!reserved.has(candidate) && !(await occupied(candidate))) {
      reserved.add(candidate);
      return candidate;
    }
  }
}

type PlanEntry =
  | { kind: "dir"; src: string; dest: string; mode: number }
  | { kind: "file"; src: string; dest: string; size: number; mode: number }
  | { kind: "special"; src: string; dest: string };

export type CopyResult = {
  src: string;
  dest: string;
  ok: boolean;
  error?: string;
};

async function collectOne(
  src: string,
  dest: string,
  out: PlanEntry[],
): Promise<{ bytes: number }> {
  const lst = await fs.lstat(src);
  if (lst.isDirectory()) {
    // Directories are recorded explicitly so empty folders (and empty
    // subfolders) are actually created at the destination.
    out.push({ kind: "dir", src, dest, mode: lst.mode });
    let bytes = 0;
    for (const child of await fs.readdir(src)) {
      const r = await collectOne(
        path.join(src, child),
        path.join(dest, child),
        out,
      );
      bytes += r.bytes;
    }
    return { bytes };
  }
  if (lst.isFile()) {
    out.push({ src, dest, size: lst.size, mode: lst.mode, kind: "file" });
    return { bytes: lst.size };
  }
  // Symlinks, sockets, fifos, …: copied as-is via fs.cp, untracked bytes.
  out.push({ kind: "special", src, dest });
  return { bytes: 0 };
}

function copyFileStream(
  src: string,
  dest: string,
  mode: number,
  onBytes: (delta: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const rs = nfs.createReadStream(src, { highWaterMark: 1024 * 1024 });
    const ws = nfs.createWriteStream(dest, {
      // Created owner-only (umask can only strip further): a private 0600
      // file is never world-readable mid-copy, and a shared 0664 file gets
      // its group bits back via the chmod on finish below. O_EXCL ("wx")
      // refuses symlinks and existing files — never follow or truncate
      // something we didn't just reserve.
      mode: mode & 0o700,
      flags: "wx",
    });
    let opened = false;
    ws.on("open", () => {
      opened = true;
    });
    rs.on("data", (chunk: string | Buffer) => {
      onBytes(
        typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length,
      );
    });
    const fail = (e: unknown) => {
      rs.destroy();
      ws.destroy();
      // Remove our own partial output only — never touch a path we failed
      // to open (it isn't ours).
      if (opened) {
        fs.rm(dest, { force: true }).then(
          () => reject(e),
          () => reject(e),
        );
      } else {
        reject(e);
      }
    };
    rs.on("error", fail);
    ws.on("error", fail);
    // Restore full source permissions only after a successful write
    // (best-effort: failure leaves the file more restrictive, never less).
    ws.on("finish", () => {
      fs.chmod(dest, mode).then(
        () => resolve(),
        () => resolve(),
      );
    });
    rs.pipe(ws);
  });
}

async function ensureParent(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function updateToast(
  toast: Toast,
  opts: {
    title: string;
    copiedBytes: number;
    totalBytes: number;
    doneFiles: number;
    totalFiles: number;
    current: string;
    force?: boolean;
    state: { last: number };
  },
) {
  const now = Date.now();
  if (!opts.force && now - opts.state.last < 150) return;
  opts.state.last = now;
  const frac =
    opts.totalBytes > 0
      ? opts.copiedBytes / opts.totalBytes
      : opts.doneFiles / Math.max(1, opts.totalFiles);
  const pct = Math.round(frac * 100);
  toast.message =
    `${progressBar(frac)} ${pct}%\n` +
    `${opts.doneFiles}/${opts.totalFiles} files · ${formatBytes(opts.copiedBytes)} / ${formatBytes(opts.totalBytes)}\n` +
    opts.current.slice(0, 80);
}

export async function copyManyWithProgress(
  sources: string[],
  destDir: string,
  toast: Toast,
  title = "Copying",
): Promise<{ results: CopyResult[]; copied: number; errors: string[] }> {
  // Plan phase — resolve + reserve every destination first so two sources
  // with the same basename can never be handed the same target.
  const reserved = new Set<string>();
  const plans: { src: string; dest: string; pairs: PlanEntry[] }[] = [];
  const results: CopyResult[] = [];
  const errors: string[] = [];
  let totalBytes = 0;

  for (const src of sources) {
    try {
      const dest = await uniqueDest(destDir, path.basename(src), reserved);
      const pairs: PlanEntry[] = [];
      const r = await collectOne(src, dest, pairs);
      totalBytes += r.bytes;
      plans.push({ src, dest, pairs });
      results.push({ src, dest, ok: true });
    } catch (e) {
      // Unreadable source (vanished, no permission) — fail just this item.
      const msg = `${src}: ${String(e)}`;
      errors.push(msg);
      results.push({
        src,
        dest: path.join(destDir, path.basename(src)),
        ok: false,
        error: msg,
      });
    }
  }

  const pairs = plans.flatMap((p, i) =>
    p.pairs.map((pair) => ({ pair, plan: i })),
  );
  const totalFiles = pairs.length;
  let copiedBytes = 0;
  let doneFiles = 0;
  const throttle = { last: 0 };
  const failedPlan = new Set<number>();
  // Directory permission fixes wait until every child is written (deepest
  // first, best-effort each).
  const pendingDirModes: { dest: string; mode: number }[] = [];

  const showProgress = (current: string, force: boolean) => {
    toast.title = `${title} ${doneFiles}/${totalFiles}`;
    updateToast(toast, {
      title: toast.title,
      copiedBytes,
      totalBytes,
      doneFiles,
      totalFiles,
      current,
      force,
      state: throttle,
    });
  };
  showProgress(path.basename(sources[0] ?? ""), true);

  for (const { pair, plan } of pairs) {
    const current = path.basename(pair.src);
    if (failedPlan.has(plan)) {
      // A failed directory poisons its whole subtree: pouring children
      // into it (or into whatever occupies its path now) would scatter
      // files into an unrelated folder. Count as done, record nothing more.
      doneFiles++;
      showProgress(current, true);
      continue;
    }
    try {
      if (pair.kind === "dir") {
        // Created owner-only (0700 survives any umask): private trees are
        // never world-readable mid-copy, yet stay writable while children
        // land inside. Non-recursive on purpose: an occupant that appeared
        // after planning must fail loudly, never be silently merged into.
        // The final source mode is applied at the very end.
        await ensureParent(pair.dest);
        await fs.mkdir(pair.dest, { mode: 0o700 });
        pendingDirModes.push({ dest: pair.dest, mode: pair.mode });
      } else if (pair.kind === "file") {
        await ensureParent(pair.dest);
        await copyFileStream(pair.src, pair.dest, pair.mode, (delta) => {
          copiedBytes += delta;
          updateToast(toast, {
            title: toast.title,
            copiedBytes,
            totalBytes,
            doneFiles,
            totalFiles,
            current,
            state: throttle,
          });
        });
      } else {
        await ensureParent(pair.dest);
        await fs.cp(pair.src, pair.dest, { recursive: true });
      }
    } catch (e) {
      failedPlan.add(plan);
      errors.push(`${pair.src}: ${String(e)}`);
    }
    doneFiles++;
    showProgress(current, true);
  }

  for (const [i, plan] of plans.entries()) {
    if (failedPlan.has(i)) {
      const r = results.find((x) => x.src === plan.src);
      if (r) {
        r.ok = false;
        r.error = errors.find((e) => e.startsWith(plan.src));
      }
    }
  }

  // Now that every child is written, restore directory permissions
  // (deepest first so parents stay traversable throughout). Best-effort:
  // a chmod failure must not fail an otherwise good copy.
  await Promise.allSettled(
    pendingDirModes
      .sort((a, b) => b.dest.length - a.dest.length)
      .map(({ dest, mode }) => fs.chmod(dest, mode)),
  );

  const copied = results.filter((r) => r.ok).length;
  return { results, copied, errors };
}

export async function moveManyWithProgress(
  sources: string[],
  destDir: string,
  toast: Toast,
  title = "Moving",
): Promise<{ moved: number; errors: string[] }> {
  // Fast path: same-volume renames are instant — no byte progress needed.
  // Destinations are reserved up front (shared set) so same-named sources
  // can't collide with each other here either.
  const reserved = new Set<string>();
  const plans: { src: string; dest: string }[] = [];
  const errors: string[] = [];
  let moved = 0;

  for (const src of sources) {
    plans.push({
      src,
      dest: await uniqueDest(destDir, path.basename(src), reserved),
    });
  }

  const fallbacks: string[] = [];
  for (const plan of plans) {
    // Re-check right before the rename: another process may have claimed
    // the name after planning (the in-memory set can't see that), and
    // rename would silently replace it. Pick a fresh name instead.
    if (await occupied(plan.dest)) {
      plan.dest = await uniqueDest(destDir, path.basename(plan.src), reserved);
    }
    try {
      await fs.rename(plan.src, plan.dest);
      moved++;
      toast.title = `${title} ${moved}/${sources.length}`;
      toast.message = `${progressBar(moved / sources.length)} ${Math.round((moved / sources.length) * 100)}%\n${path.basename(plan.src).slice(0, 80)}`;
    } catch {
      fallbacks.push(plan.src);
    }
  }

  if (fallbacks.length > 0) {
    // Cross-volume: copy with byte progress, then trash ONLY the sources
    // whose copy fully succeeded (verified per source, never by guessing
    // from destination existence).
    toast.title = `${title} (copying across volumes)`;
    const r = await copyManyWithProgress(fallbacks, destDir, toast, title);
    errors.push(...r.errors);
    const okBySrc = new Map(r.results.map((x) => [x.src, x.ok] as const));
    for (const src of fallbacks) {
      if (!okBySrc.get(src)) continue;
      const t = await safeTrash([src]);
      if (t.errors.length > 0) {
        errors.push(...t.errors);
      } else {
        moved++;
      }
    }
  }
  return { moved, errors };
}
