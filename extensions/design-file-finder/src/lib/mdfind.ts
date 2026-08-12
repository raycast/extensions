import { execFile } from "node:child_process";
import { promisify } from "node:util";

const pexec = promisify(execFile);

/**
 * Spotlight query matching any of the given extensions by filename.
 * `cd` = case-insensitive, diacritic-insensitive comparison.
 */
export function buildMdfindQuery(exts: string[]): string {
  return exts.map((e) => `kMDItemFSName == "*.${e}"cd`).join(" || ");
}

export function buildMdfindArgs(volume: string, exts: string[]): string[] {
  return ["-onlyin", volume, buildMdfindQuery(exts)];
}

export function parseMdfindOutput(stdout: string): string[] {
  return stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Run mdfind for one volume. Returns [] on any failure (e.g. unmounted). */
export async function runMdfind(volume: string, exts: string[]): Promise<string[]> {
  if (exts.length === 0) return [];
  try {
    const { stdout } = await pexec("mdfind", buildMdfindArgs(volume, exts), {
      // Generous bound: mdfind emits one path per line. 256MB covers absurdly large
      // libraries; beyond that execFile rejects and we degrade to [] for this volume.
      maxBuffer: 256 * 1024 * 1024,
    });
    return parseMdfindOutput(stdout);
  } catch {
    return [];
  }
}
