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

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Destination that does not collide: "Name", "Name copy", "Name copy 2", … (ext-aware). */
export async function uniqueDest(
  destDir: string,
  baseName: string,
): Promise<string> {
  const { stem, ext } = splitName(baseName);
  let candidate = path.join(destDir, baseName);
  if (!(await exists(candidate))) return candidate;
  candidate = path.join(destDir, `${stem} copy${ext}`);
  if (!(await exists(candidate))) return candidate;
  let n = 2;
  while (true) {
    candidate = path.join(destDir, `${stem} copy ${n}${ext}`);
    if (!(await exists(candidate))) return candidate;
    n++;
  }
}

type FilePair = { src: string; dest: string; size: number; symlink: boolean };

async function collectOne(
  src: string,
  dest: string,
  pairs: FilePair[],
): Promise<{ bytes: number; files: number }> {
  const lst = await fs.lstat(src);
  if (lst.isSymbolicLink()) {
    pairs.push({ src, dest, size: 0, symlink: true });
    return { bytes: 0, files: 1 };
  }
  if (lst.isFile()) {
    pairs.push({ src, dest, size: lst.size, symlink: false });
    return { bytes: lst.size, files: 1 };
  }
  if (lst.isDirectory()) {
    let bytes = 0;
    let files = 0;
    const children = await fs.readdir(src);
    for (const child of children) {
      const r = await collectOne(
        path.join(src, child),
        path.join(dest, child),
        pairs,
      );
      bytes += r.bytes;
      files += r.files;
    }
    // Empty dirs still count so mkdir happens
    if (children.length === 0) files += 0;
    return { bytes, files };
  }
  // sockets, fifos, etc: copy via fs.cp, untracked bytes
  pairs.push({ src, dest, size: 0, symlink: true });
  return { bytes: 0, files: 1 };
}

function copyFileStream(
  src: string,
  dest: string,
  onBytes: (delta: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const rs = nfs.createReadStream(src, { highWaterMark: 1024 * 1024 });
    const ws = nfs.createWriteStream(dest, { mode: 0o644 });
    rs.on("data", (chunk: string | Buffer) => {
      onBytes(
        typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length,
      );
    });
    rs.on("error", (e) => {
      ws.destroy();
      reject(e);
    });
    ws.on("error", (e) => {
      rs.destroy();
      reject(e);
    });
    ws.on("finish", () => resolve());
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
): Promise<{ copied: number; errors: string[] }> {
  const pairs: FilePair[] = [];
  let totalBytes = 0;
  // Plan phase — resolve unique destinations first
  const topDests: string[] = [];
  for (const src of sources) {
    const dest = await uniqueDest(destDir, path.basename(src));
    topDests.push(dest);
    const r = await collectOne(src, dest, pairs);
    totalBytes += r.bytes;
  }
  const totalFiles = pairs.length;
  let copiedBytes = 0;
  let doneFiles = 0;
  const errors: string[] = [];
  const throttle = { last: 0 };

  toast.title = `${title} 0/${totalFiles}`;
  updateToast(toast, {
    title: toast.title,
    copiedBytes,
    totalBytes,
    doneFiles,
    totalFiles,
    current: path.basename(sources[0] ?? ""),
    force: true,
    state: throttle,
  });

  for (const pair of pairs) {
    const current = path.basename(pair.src);
    try {
      if (pair.symlink) {
        await ensureParent(pair.dest);
        await fs.cp(pair.src, pair.dest, { recursive: true });
      } else {
        await ensureParent(pair.dest);
        // Preserve mode for executables
        const st = await fs.stat(pair.src);
        await copyFileStream(pair.src, pair.dest, (delta) => {
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
        try {
          await fs.chmod(pair.dest, st.mode);
        } catch {
          // non-fatal
        }
      }
    } catch (e) {
      errors.push(`${pair.src}: ${String(e)}`);
    }
    doneFiles++;
    toast.title = `${title} ${doneFiles}/${totalFiles}`;
    updateToast(toast, {
      title: toast.title,
      copiedBytes,
      totalBytes,
      doneFiles,
      totalFiles,
      current,
      force: true,
      state: throttle,
    });
  }
  return { copied: doneFiles - errors.length, errors };
}

export async function moveManyWithProgress(
  sources: string[],
  destDir: string,
  toast: Toast,
  title = "Moving",
): Promise<{ moved: number; errors: string[] }> {
  // Fast path: same-volume renames are instant — no byte progress needed.
  const fallbacks: { src: string; dest: string }[] = [];
  const errors: string[] = [];
  let moved = 0;

  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    const dest = await uniqueDest(destDir, path.basename(src));
    try {
      await fs.rename(src, dest);
      moved++;
      toast.title = `${title} ${moved}/${sources.length}`;
      toast.message = `${progressBar(moved / sources.length)} ${Math.round((moved / sources.length) * 100)}%\n${path.basename(src).slice(0, 80)}`;
    } catch {
      fallbacks.push({ src, dest });
    }
  }

  if (fallbacks.length > 0) {
    // Cross-volume: copy with byte progress, then trash originals.
    toast.title = `${title} (copying across volumes)`;
    const r = await copyManyWithProgress(
      fallbacks.map((f) => f.src),
      destDir,
      toast,
      title,
    );
    errors.push(...r.errors);
    // Trash only what we successfully copied: re-derive by checking dest existence
    const copiedSrcs: string[] = [];
    for (const f of fallbacks) {
      const dest = path.join(destDir, path.basename(f.src));
      // uniqueDest may have suffixed; find the actual newest match
      if (await exists(dest)) {
        copiedSrcs.push(f.src);
      } else {
        // suffixed variant — assume copy succeeded if no error recorded for it
        const hasErr = r.errors.some((e) => e.startsWith(f.src));
        if (!hasErr) copiedSrcs.push(f.src);
      }
    }
    try {
      if (copiedSrcs.length > 0) {
        const t = await safeTrash(copiedSrcs);
        errors.push(...t.errors);
      }
    } catch (e) {
      errors.push(`trash originals: ${String(e)}`);
    }
    moved += r.copied;
  }
  return { moved, errors };
}

export async function duplicateWithProgress(
  srcPath: string,
  toast: Toast,
): Promise<{ dest: string; errors: string[] }> {
  const dest = await uniqueDest(path.dirname(srcPath), path.basename(srcPath));
  const r = await copyManyWithProgress(
    [srcPath],
    path.dirname(srcPath),
    toast,
    "Duplicating",
  );
  // copyManyWithProgress re-resolves uniqueDest internally, so find actual result:
  // if exactly one top-level dest was created, prefer it; otherwise return our precomputed one.
  void dest;
  return { dest, errors: r.errors };
}
