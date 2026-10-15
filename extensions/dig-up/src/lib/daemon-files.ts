// What the menu bar can tell from the daemon's files without starting it: whether one runs, and whether any folder is
// chosen; and whether a process is the daemon (client.ts asks before it signals one). No @raycast/api: it reads those
// two files and asks ps (test/results.test.ts).

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DAEMON_INFO_FILE, type Config, type DaemonInfo } from "../../engine/api";

/** The daemon's settings file (engine/paths.ts `configFile`). */
export const CONFIG_FILE = "config.json";

function readJSON<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

function alive(pid: unknown): boolean {
  if (typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    // ESRCH: gone. EPERM: it belongs to someone else, which a daemon of ours never does.
    return false;
  }
}

/** The title the daemon gives its process (engine/daemon.ts main); `ps` shows it as the command from then on. */
const DAEMON_TITLE = "dig-up-daemon";

/**
 * Whether the process `info.pid` is the daemon `info` describes: its command is our daemon (the title main sets, or
 * `daemonJs` before it's set) and it started when daemon.json says. daemon.json outlives a daemon that was killed or
 * crashed, and its pid can belong to another program by then.
 */
export function isOurDaemon(info: DaemonInfo, daemonJs: string): boolean {
  let line: string;
  try {
    // etime ("[[dd-]hh:]mm:ss") rather than lstart: lstart's text follows the locale and repeats an hour at DST's end.
    line = execFileSync("/bin/ps", ["-p", String(info.pid), "-o", "etime=,command="], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return false; // gone, or ps can't tell: leave it alone
  }
  const match = line.trim().match(/^(\S+)\s+([\s\S]*)$/);
  if (!match) return false;
  const command = match[2];
  if (!command.includes(DAEMON_TITLE) && !command.includes(daemonJs)) return false;
  const elapsed = elapsedSeconds(match[1]);
  if (elapsed === null || !Number.isFinite(info.startedAt)) return true; // the command alone has to do
  return Math.abs(Date.now() - elapsed * 1000 - info.startedAt) < 5000;
}

/** `ps -o etime` → seconds: "05:02", "01:05:02", "3-01:05:02"; null when unreadable. */
export function elapsedSeconds(etime: string): number | null {
  const match = etime.match(/^(?:(\d+)-)?(?:(\d+):)?(\d+):(\d+)$/);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  return ((Number(days ?? 0) * 24 + Number(hours ?? 0)) * 60 + Number(minutes)) * 60 + Number(seconds);
}

/** The daemon recorded in `<support>/daemon.json` (started from `daemonJs`) is running. */
export function daemonRunning(support: string, daemonJs: string): boolean {
  const info = readJSON<DaemonInfo>(join(support, DAEMON_INFO_FILE));
  return info !== null && alive(info.pid) && isOurDaemon(info, daemonJs);
}

/**
 * Whether the settings name any folder or code folder: "no" only when the file says so, or when there is no file yet
 * (a fresh install); "unknown" when it can't be read as settings, so the caller doesn't guess.
 */
export function foldersChosen(support: string): "yes" | "no" | "unknown" {
  let text: string;
  try {
    text = readFileSync(join(support, CONFIG_FILE), "utf8");
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT" ? "no" : "unknown";
  }
  let config: Partial<Config>;
  try {
    config = JSON.parse(text) as Partial<Config>;
  } catch {
    return "unknown";
  }
  if (!Array.isArray(config.folders) && !Array.isArray(config.codeFolders)) return "unknown";
  const count = (config.folders?.length ?? 0) + (config.codeFolders?.length ?? 0);
  return count > 0 ? "yes" : "no";
}
