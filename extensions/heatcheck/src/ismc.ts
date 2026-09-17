import { createHash } from "node:crypto";
import { chmod, mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { environment } from "@raycast/api";
import { execa } from "execa";

// iSMC (https://github.com/dkorunic/iSMC) is a GPL-3.0 SMC/HID sensor CLI.
// We never bundle or redistribute it: on first run we download the pinned
// universal binary from the project's own GitHub release (a server we do not
// control) and verify it against a SHA256 hash pinned in source. The binary
// ships ad-hoc signed, so it executes on Apple Silicon; fetching it over the
// network (rather than via a browser) means no com.apple.quarantine xattr, so
// Gatekeeper does not block it. We invoke it as a separate process — no linking,
// no derivative work.
//
// To bump: change VERSION and TARBALL_SHA256 together. The version is part of
// the cached filename, so a bump invalidates the old cache and re-downloads.
const VERSION = "v0.16.5";
const TARBALL_URL = `https://github.com/dkorunic/iSMC/releases/download/${VERSION}/iSMC_Darwin_all.tar.gz`;
const TARBALL_SHA256 =
  "bc41d966ebb20eabb8a97967b2952febf3fbf888c2174103e869379c8b6542d5";

// The downloaded bytes did not match the hash pinned in source: a corrupted or
// tampered release from a server we do not control. Thrown distinctly from
// network failures so callers can surface it loudly — a hash mismatch is a
// security event, not a reason to degrade quietly.
export class ChecksumMismatchError extends Error {
  constructor(
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`iSMC checksum mismatch: expected <${expected}>, got <${actual}>`);
    this.name = "ChecksumMismatchError";
  }
}

const BIN_DIR = join(environment.supportPath, "bin");
const BIN_PATH = join(BIN_DIR, `iSMC-${VERSION}`);

// Upper bounds so a stalled GitHub fetch or a wedged tar can never hang the
// caller (heat-check auto-refreshes every 4s). The download covers a one-time
// multi-MB fetch on a slow connection; extraction is local and quick.
const DOWNLOAD_TIMEOUT_MS = 30_000;
const EXTRACT_TIMEOUT_MS = 10_000;

// Concurrent callers (heat-check auto-refreshes every 4s) must not kick off
// parallel downloads on the very first run; share one in-flight promise.
let downloadInFlight: Promise<string> | null = null;

/**
 * Returns the path to a ready-to-run iSMC binary, downloading and verifying it
 * on first use. Throws if the download or checksum check fails — the caller
 * decides whether absent sensors are tolerable.
 */
export async function ensureISmc(): Promise<string> {
  if (await isExecutable(BIN_PATH)) {
    return BIN_PATH;
  }

  if (!downloadInFlight) {
    downloadInFlight = downloadAndVerify().finally(() => {
      downloadInFlight = null;
    });
  }

  return downloadInFlight;
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    // A regular file is not enough: a half-written or chmod-stripped file at the
    // cache path would pass isFile() and then fail at spawn. Require an exec bit.
    return stats.isFile() && (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
}

async function downloadAndVerify(): Promise<string> {
  const res = await fetch(TARBALL_URL, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(
      `iSMC download failed: HTTP <${res.status}> from <${TARBALL_URL}>`,
    );
  }

  const tarball = Buffer.from(await res.arrayBuffer());
  const digest = createHash("sha256").update(tarball).digest("hex");
  if (digest !== TARBALL_SHA256) {
    throw new ChecksumMismatchError(TARBALL_SHA256, digest);
  }

  await mkdir(BIN_DIR, { recursive: true });

  // Extract only the iSMC binary (the tarball also carries README/LICENSE/etc.)
  // using macOS's built-in tar, then atomically move it into place.
  const tarPath = `${BIN_PATH}.tar.gz`;
  const extractedPath = join(BIN_DIR, "iSMC");
  try {
    await writeFile(tarPath, tarball);
    await execa("tar", ["xzf", tarPath, "-C", BIN_DIR, "iSMC"], {
      timeout: EXTRACT_TIMEOUT_MS,
    });
    await rename(extractedPath, BIN_PATH);
    await chmod(BIN_PATH, 0o755);
  } finally {
    await rm(tarPath, { force: true });
  }

  return BIN_PATH;
}
