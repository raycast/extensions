import * as fs from "fs";
import * as path from "path";
import { environment, open } from "@raycast/api";
import { runWithTimeout } from "../shell";
import {
  parseSoftwareUpdateList,
  type SystemUpdate,
} from "./system-updates-parse";

// A pending macOS system update — the OS itself, Safari, security responses,
// etc. The most important updates on a Mac, and no other Raycast updater
// surfaces them. We DETECT and surface, then hand off to System Settings to
// apply: OS installs are large, often need a restart, and require root — not
// something to run silently. The pure `softwareupdate -l` parser lives in
// ./system-updates-parse so it stays unit-testable.
export type { SystemUpdate };

function cachePath(): string {
  return path.join(environment.supportPath, "system-updates-v1.json");
}

const TTL = 6 * 60 * 60 * 1000; // 6h — softwareupdate -l is slow, don't re-run often

/**
 * List pending macOS system updates. Cached to disk (6h) because
 * `softwareupdate -l` does a real network scan that can take 10–30s. Pass
 * `{ force }` to bypass the cache. Returns [] when up to date or on any error
 * (network, sandbox) — system updates are a bonus, never a blocker.
 */
export async function checkSystemUpdates(
  opts: { force?: boolean } = {},
): Promise<SystemUpdate[]> {
  if (!opts.force) {
    try {
      const stat = fs.statSync(cachePath());
      if (Date.now() - stat.mtimeMs < TTL) {
        return JSON.parse(
          fs.readFileSync(cachePath(), "utf8"),
        ) as SystemUpdate[];
      }
    } catch {
      /* no/stale cache — fall through to a fresh scan */
    }
  }
  try {
    // `-l` lists (no sudo needed). 2-minute ceiling for a slow network scan.
    const { stdout } = await runWithTimeout(
      "/usr/sbin/softwareupdate",
      ["-l"],
      120_000,
    );
    const list = parseSoftwareUpdateList(stdout);
    try {
      fs.mkdirSync(environment.supportPath, { recursive: true });
      fs.writeFileSync(cachePath(), JSON.stringify(list));
    } catch {
      /* cache write is best-effort */
    }
    return list;
  } catch {
    return [];
  }
}

/** Open System Settings → General → Software Update, where the user installs. */
export async function openSoftwareUpdate(): Promise<void> {
  await open("x-apple.systempreferences:com.apple.preferences.softwareupdate");
}
