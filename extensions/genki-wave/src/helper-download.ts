import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

// The store extension doesn't bundle the helper: it downloads the release pinned in
// helper-release.ts, checks it against the pinned SHA-256, and keeps it in Raycast's
// support folder. The same approach as Raycast's Bitwarden extension.

const run = promisify(execFile);

export type HelperRelease = { version: string; sha256: string; url: string };

/** The helper for `release` in `dir`, downloaded and verified first if it isn't there yet. */
export async function ensureRelease(release: HelperRelease, dir: string): Promise<string> {
  const path = join(dir, `wave-helper-${release.version}`);
  if (existsSync(path)) return path;

  const response = await fetch(release.url);
  if (!response.ok) throw new Error(`Couldn't download the Wave helper: ${response.status} ${response.statusText}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== release.sha256) {
    throw new Error(`The downloaded Wave helper doesn't match its checksum (${sha256}); not installing it`);
  }

  const work = mkdtempSync(join(dir, ".download-"));
  try {
    const zip = join(work, "wave-helper.zip");
    writeFileSync(zip, bytes);
    await run("/usr/bin/ditto", ["-x", "-k", zip, work]);
    const unpacked = join(work, "wave-helper");
    readFileSync(unpacked); // throws if the zip didn't hold the helper
    chmodSync(unpacked, 0o755);
    renameSync(unpacked, path);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  // Earlier versions aren't used again; the listener runs its own copy.
  for (const name of readdirSync(dir)) {
    if (name.startsWith("wave-helper-") && join(dir, name) !== path) rmSync(join(dir, name), { force: true });
  }
  return path;
}
