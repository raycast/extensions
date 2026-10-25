import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * The native host release this version of the extension installs, written
 * by the release workflow (native-host/scripts/pin-for-raycast.js).
 */
export interface HostPin {
  version: string;
  sha256: Record<string, string>;
}

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

export function isValidPin(value: unknown): value is HostPin {
  const pin = value as HostPin;
  return (
    typeof pin?.version === "string" &&
    VERSION.test(pin.version) &&
    typeof pin.sha256 === "object" &&
    pin.sha256 !== null &&
    Object.keys(pin.sha256).length > 0 &&
    Object.values(pin.sha256).every((h) => typeof h === "string" && /^[0-9a-f]{64}$/.test(h))
  );
}

/**
 * Compare two `major.minor.patch` versions. Returns a negative number when
 * `a` is older, positive when newer, 0 when equal. Throws on anything else.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const m = v.trim().match(VERSION);
    if (!m) throw new Error(`Not a version: ${v}`);
    return m.slice(1).map(Number);
  };
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/**
 * Whether an installed native host should be replaced by the pinned one:
 * only when it is older. A missing version means there is no installed
 * bundle to update (not installed, or running from a development checkout),
 * and an unreadable one is left alone too.
 */
export function hostUpdateNeeded(installedVersion: string | null, pinnedVersion: string): boolean {
  if (!installedVersion) return false;
  try {
    return compareVersions(installedVersion, pinnedVersion) < 0;
  } catch {
    return false;
  }
}

/** Throw unless `contents` has the SHA-256 pinned for `name`. */
export function verifyPinnedFile(contents: Buffer, name: string, pin: HostPin): void {
  const expected = pin.sha256[name];
  if (!expected) {
    throw new Error(`No pinned checksum for ${name}. Please report this issue.`);
  }
  const actual = createHash("sha256").update(contents).digest("hex");
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for ${name}: the download doesn't match the pinned release. Please try again.`);
  }
}

/**
 * PIDs of running native hosts older than `pinnedVersion`: every host whose
 * record has an older (or no) version, plus a host from before per-profile
 * records, which only wrote the shared `host.pid` file.
 */
export function outdatedHostPids(
  configDir: string,
  pinnedVersion: string,
  read: (file: string) => string = (file) => readFileSync(file, "utf-8"),
  list: (dir: string) => string[] = (dir) => readdirSync(dir)
): number[] {
  const pids = new Set<number>();
  let names: string[] = [];
  try {
    names = list(join(configDir, "hosts")).filter((n) => n.endsWith(".json"));
  } catch {
    // No per-profile records
  }
  for (const name of names) {
    try {
      const record = JSON.parse(read(join(configDir, "hosts", name))) as { pid?: unknown; version?: unknown };
      if (!Number.isInteger(record.pid)) continue;
      const current = typeof record.version === "string" && !hostUpdateNeeded(record.version, pinnedVersion);
      if (!current) pids.add(record.pid as number);
    } catch {
      // Unreadable record
    }
  }
  try {
    const legacy = parseInt(read(join(configDir, "host.pid")).trim(), 10);
    if (Number.isInteger(legacy) && legacy > 0) pids.add(legacy);
  } catch {
    // No legacy host
  }
  return [...pids];
}

/** Whether `pid` is a native host running from the installed bundle. */
function isInstalledHost(pid: number): boolean {
  try {
    return execFileSync("ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf-8" }).includes(
      "/.raycast-firefox/bin/host.bundle.js"
    );
  } catch {
    return false;
  }
}

/**
 * Stop outdated native hosts so Firefox starts the updated one. The companion
 * extension reconnects when its host exits, which launches the new bundle.
 * Only processes running the installed host bundle are signalled, so a
 * reused PID is never touched. Returns how many hosts were stopped.
 */
export function restartOutdatedHosts(
  configDir: string,
  pinnedVersion: string,
  {
    pids = outdatedHostPids(configDir, pinnedVersion),
    isHost = isInstalledHost,
    kill = process.kill.bind(process),
  } = {}
): number {
  let stopped = 0;
  for (const pid of pids) {
    if (!isHost(pid)) continue;
    try {
      kill(pid, "SIGTERM");
      stopped++;
    } catch {
      // Already gone
    }
  }
  return stopped;
}
