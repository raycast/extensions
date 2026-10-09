import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const QUIT_TIMEOUT_MS = 30_000;
const LAUNCH_TIMEOUT_MS = 10_000;

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.split("/").includes("..")) return false;
  try {
    return statSync(join("/usr/share/zoneinfo", tz)).isFile();
  } catch {
    return false;
  }
}

async function readPlistKey(plist: string, key: string): Promise<string> {
  const { stdout } = await run("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plist]);
  return stdout.trim();
}

async function mainPid(executable: string): Promise<number | undefined> {
  const { stdout } = await run("/bin/ps", ["-Ao", "pid=,comm="], { maxBuffer: 16 * 1024 * 1024 });
  for (const line of stdout.split("\n")) {
    const match = /^\s*(\d+) (.*)$/.exec(line);
    if (match?.[2] === executable) return Number(match[1]);
  }
}

async function waitFor<T>(probe: () => Promise<T>, done: (value: T) => boolean, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (done(value) || Date.now() >= deadline) return value;
    await sleep(500);
  }
}

/**
 * Quit the app if it is running, relaunch it with TZ (and __XPC_TZ, which propagates TZ into
 * XPC services such as WKWebView's WebKit processes), then verify the new process carries TZ.
 * `verified` is false when macOS hides the process environment (e.g. Apple system apps),
 * in which case TZ was passed but cannot be confirmed.
 * If the app is running, `confirmQuit` is asked first; declining resolves with `undefined`
 * and leaves the app untouched.
 */
export async function relaunchWithTimeZone(
  appPath: string,
  tz: string,
  hooks: { onProgress?: (message: string) => void; confirmQuit?: () => Promise<boolean> } = {},
): Promise<{ pid: number; verified: boolean } | undefined> {
  const { onProgress = () => {}, confirmQuit = async () => true } = hooks;
  const appName = basename(appPath);
  if (!isValidTimeZone(tz)) throw new Error(`Unknown time zone: ${tz}`);

  const info = join(appPath, "Contents", "Info.plist");
  const executable = join(appPath, "Contents", "MacOS", await readPlistKey(info, "CFBundleExecutable"));
  const bundleId = await readPlistKey(info, "CFBundleIdentifier");

  const runningPid = await mainPid(executable);
  if (runningPid !== undefined) {
    if (!(await confirmQuit())) return undefined;
    onProgress(`Quitting ${appName}…`);
    try {
      await run("/usr/bin/osascript", ["-e", `tell application id "${bundleId}" to quit`]);
    } catch {
      process.kill(runningPid, "SIGTERM");
    }
    const stillRunning = await waitFor(
      () => mainPid(executable),
      (pid) => pid === undefined,
      QUIT_TIMEOUT_MS,
    );
    if (stillRunning !== undefined) throw new Error(`${appName} did not quit within 30s (unsaved-changes dialog?)`);
  }

  onProgress(`Launching ${appName} with TZ=${tz}…`);
  await run("/usr/bin/open", ["-n", "--env", `TZ=${tz}`, "--env", `__XPC_TZ=${tz}`, appPath]);

  const pid = await waitFor(
    () => mainPid(executable),
    (p) => p !== undefined,
    LAUNCH_TIMEOUT_MS,
  );
  if (pid === undefined) throw new Error(`${appName} did not start`);

  const ps = (...flags: string[]) => run("/bin/ps", [...flags, "-ww", "-o", "command=", "-p", String(pid)]);
  const [withEnv, withoutEnv] = await Promise.all([ps("-E"), ps()]);
  if (withEnv.stdout.trim() === withoutEnv.stdout.trim()) return { pid, verified: false };
  if (!withEnv.stdout.split(/\s+/).includes(`TZ=${tz}`)) {
    throw new Error(`${appName} started (pid ${pid}) but TZ=${tz} not found in its environment`);
  }
  return { pid, verified: true };
}
