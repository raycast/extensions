import { promises as fs } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as os from "node:os";
import * as path from "node:path";
import { uniqueDest } from "./copy-progress";

const execFileAsync = promisify(execFile);

function isInsideOrEqual(child: string, parent: string): boolean {
  if (child === parent) return true;
  const rel = path.relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Staging lives next to the destination (same volume = fast) unless the
 * destination is inside one of the sources being archived — then staging
 * there would copy the stage into itself, so fall back to the OS temp dir.
 */
async function makeStage(destDir: string, sources: string[]): Promise<string> {
  const parent = sources.some((s) => isInsideOrEqual(destDir, s))
    ? os.tmpdir()
    : destDir;
  return fs.mkdtemp(path.join(parent, ".compress-"));
}

/**
 * ZIP compress via macOS `ditto` (preserves resource forks, quarantine-safe).
 * Result is Finder-like: a file lands at the archive top level, a folder
 * lands as a top-level folder (ditto archives dir *contents*, so dirs go
 * through a same-volume staging dir first).
 */
export async function compressOne(
  srcPath: string,
  destDir: string,
): Promise<{ dest: string }> {
  const base = path.basename(srcPath);
  const dest = await uniqueDest(destDir, `${base}.zip`);
  const st = await fs.lstat(srcPath);
  if (st.isSymbolicLink() || st.isFile()) {
    await execFileAsync("ditto", ["-c", "-k", "--sequesterRsrc", base, dest], {
      cwd: path.dirname(srcPath),
    });
    return { dest };
  }
  // Directories: stage so the folder itself (not just its contents) is kept.
  const stage = await makeStage(destDir, [srcPath]);
  try {
    const name = await uniqueBasename(stage, base);
    await fs.cp(srcPath, path.join(stage, name), { recursive: true });
    await execFileAsync("ditto", ["-c", "-k", "--sequesterRsrc", name, dest], {
      cwd: stage,
    });
    return { dest };
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}

/**
 * Compress several items (possibly from different folders) into one ZIP in
 * destDir. Items are staged through a temp dir on the same volume so the
 * archive has clean top-level names, then the stage is removed.
 */
export async function compressMany(
  sources: string[],
  destDir: string,
  zipBaseName: string,
  onFile?: (done: number, total: number, name: string) => void,
): Promise<{ dest: string }> {
  const dest = await uniqueDest(
    destDir,
    zipBaseName.endsWith(".zip") ? zipBaseName : `${zipBaseName}.zip`,
  );
  const stage = await makeStage(destDir, sources);
  try {
    const stagedNames: string[] = [];
    let done = 0;
    for (const src of sources) {
      const name = await uniqueBasename(stage, path.basename(src));
      await fs.cp(src, path.join(stage, name), { recursive: true });
      stagedNames.push(name);
      done++;
      onFile?.(done, sources.length, path.basename(src));
    }
    // ditto -c -k accepts only ONE source, so multi-item archives use
    // `zip -r -y` (symlinks stored as links, spaces handled via argv).
    await execFileAsync("zip", ["-q", "-r", "-y", dest, ...stagedNames], {
      cwd: stage,
    });
    return { dest };
  } finally {
    await fs.rm(stage, { recursive: true, force: true });
  }
}

async function uniqueBasename(dir: string, base: string): Promise<string> {
  const idx = base.lastIndexOf(".");
  const stem = idx > 0 ? base.slice(0, idx) : base;
  const ext = idx > 0 ? base.slice(idx) : "";
  let candidate = base;
  let n = 2;
  while (true) {
    try {
      await fs.access(path.join(dir, candidate));
      candidate = `${stem} copy${n > 2 ? ` ${n}` : ""}${ext}`;
      n++;
    } catch {
      return candidate;
    }
  }
}

/** Extract a .zip archive with ditto into destDir. Only .zip is supported. */
export async function extractZip(
  archivePath: string,
  destDir: string,
): Promise<void> {
  if (path.extname(archivePath).toLowerCase() !== ".zip") {
    throw new Error(
      `Only .zip archives can be extracted (got ${path.basename(archivePath)})`,
    );
  }
  try {
    await fs.access(archivePath);
  } catch {
    throw new Error(`Archive no longer exists: ${archivePath}`);
  }
  await execFileAsync("ditto", ["-x", "-k", archivePath, destDir]);
}

export function archiveDisplayName(sources: string[]): string {
  if (sources.length === 1) return `${path.basename(sources[0])}.zip`;
  return `${path.basename(sources[0])} +${sources.length - 1} more.zip`;
}
