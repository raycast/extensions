import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { environment } from "@raycast/api";
import {
  AUDIO_FORMAT_BIN,
  BUNDLE_ID,
  CACHE_DIR,
  DAEMON_OFF_FLAG,
  LAUNCH_AGENTS_DIR,
  PLIST_PATH,
  SUPPORT_DIR,
  WATCHER_BIN,
} from "./paths";
import { clearFlag, isFlagSet, setFlag } from "./flags";

const execFileP = promisify(execFile);

export type DaemonStatus = "running" | "stopped" | "not-installed";

export async function status(): Promise<DaemonStatus> {
  if (!(await fileExists(PLIST_PATH))) return "not-installed";
  const uid = process.getuid?.() ?? 0;
  try {
    await execFileP("/bin/launchctl", ["print", `gui/${uid}/${BUNDLE_ID}`]);
    return "running";
  } catch {
    return "stopped";
  }
}

export async function ensureInstalled(): Promise<void> {
  // Fast path: if everything is already in place, do nothing.
  if (await isFullyInstalled()) return;

  await fs.mkdir(SUPPORT_DIR, { recursive: true });
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.mkdir(LAUNCH_AGENTS_DIR, { recursive: true });

  await copyAsset("lossless-watcher", WATCHER_BIN);
  await copyAsset("audio_format", AUDIO_FORMAT_BIN);
  await fs.chmod(WATCHER_BIN, 0o755);
  await fs.chmod(AUDIO_FORMAT_BIN, 0o755);

  await writePlist();

  if (!(await isFlagSet(DAEMON_OFF_FLAG))) {
    await bootstrap();
  }
}

async function isFullyInstalled(): Promise<boolean> {
  if (!(await fileExists(PLIST_PATH))) return false;
  if (!(await fileExists(WATCHER_BIN))) return false;
  if (!(await fileExists(AUDIO_FORMAT_BIN))) return false;
  // Daemon must actually be running unless user has explicitly stopped it.
  if (await isFlagSet(DAEMON_OFF_FLAG)) return true; // user wants it stopped — install is otherwise complete
  return (await status()) === "running";
}

async function copyAsset(name: string, dest: string): Promise<void> {
  const src = path.join(environment.assetsPath, name);
  await fs.copyFile(src, dest);
}

async function writePlist(): Promise<void> {
  const tplPath = path.join(environment.assetsPath, "plist.template");
  let tpl = await fs.readFile(tplPath, "utf8");
  tpl = tpl
    .replaceAll("__BUNDLE_ID__", BUNDLE_ID)
    .replaceAll("__WATCHER_BIN__", WATCHER_BIN)
    .replaceAll("__WATCHER_OUT__", path.join(CACHE_DIR, "watcher.out"))
    .replaceAll("__WATCHER_ERR__", path.join(CACHE_DIR, "watcher.err"));
  await fs.writeFile(PLIST_PATH, tpl, "utf8");
}

async function bootstrap(): Promise<void> {
  const uid = process.getuid?.() ?? 0;
  // bootout first to make this idempotent — ignore errors (it's not loaded yet).
  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${BUNDLE_ID}`]);
  } catch {
    // not loaded — fine
  }
  await execFileP("/bin/launchctl", ["bootstrap", `gui/${uid}`, PLIST_PATH]);
}

export async function start(): Promise<void> {
  await clearFlag(DAEMON_OFF_FLAG);
  await bootstrap();
}

export async function stop(): Promise<void> {
  const uid = process.getuid?.() ?? 0;
  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${BUNDLE_ID}`]);
  } catch {
    // already stopped — fine
  }
  await setFlag(DAEMON_OFF_FLAG);
}

export interface UninstallResult {
  successes: string[];
  failures: { path: string; error: string }[];
}

export async function uninstall(): Promise<UninstallResult> {
  const uid = process.getuid?.() ?? 0;
  const result: UninstallResult = { successes: [], failures: [] };

  try {
    await execFileP("/bin/launchctl", ["bootout", `gui/${uid}/${BUNDLE_ID}`]);
    result.successes.push("launchctl bootout");
  } catch (err) {
    // not loaded — not a real failure
    result.successes.push("launchctl bootout (was not running)");
  }

  for (const target of [PLIST_PATH, SUPPORT_DIR, CACHE_DIR]) {
    try {
      await fs.rm(target, { recursive: true, force: true });
      result.successes.push(target);
    } catch (err) {
      result.failures.push({ path: target, error: (err as Error).message });
    }
  }

  return result;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
