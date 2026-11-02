import { execFile } from "node:child_process";
import {
  chmodSync,
  closeSync,
  copyFileSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, userInfo } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

// Raycast commands only live for a moment, so the helper that holds the ring
// connection and waits for button presses runs as a launchd agent instead.

export const LABEL = "com.genkiinstruments.wave-listener";

const run = promisify(execFile);
const domain = () => `gui/${userInfo().uid}`;
const plistPath = () => join(homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);

export function logPath(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const base = env.XDG_STATE_HOME || join(home, ".local", "state");
  return join(base, "genki-wave", "listener.log");
}

/** The first line the helper logs when it starts; everything after it is the current run. */
const RUN_START = "wave-helper: bindings:";

/**
 * The listener's current run, read from the end of the log: a busy ring logs every
 * press, so a fixed-size tail loses the line that says it connected. Stops at 2 MB.
 */
export function readLogTail(path = logPath(), limit = 2 * 1024 * 1024): string {
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch {
    return "";
  }
  try {
    const size = fstatSync(fd).size;
    const chunk = 64 * 1024;
    let text = "";
    for (let end = size; end > 0 && size - end < limit; end -= chunk) {
      const start = Math.max(0, end - chunk);
      const buffer = Buffer.alloc(end - start);
      readSync(fd, buffer, 0, buffer.length, start);
      text = buffer.toString("utf8") + text;
      const run = text.lastIndexOf(RUN_START);
      if (run >= 0) return text.slice(run);
    }
    return text;
  } finally {
    closeSync(fd);
  }
}

/** The last `count` lines of a file, reading only its end (64 KB), for diagnostics. */
export function readLastLines(path: string, count: number): string {
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch {
    return "";
  }
  try {
    const size = fstatSync(fd).size;
    const length = Math.min(size, 64 * 1024);
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, size - length);
    const lines = buffer.toString("utf8").trimEnd().split("\n");
    // Starting mid-file, the first line is a fragment: it may hold part of a transcript
    // without the `"text":"` that diagnostics redact by, so it's never kept.
    if (length < size) lines.shift();
    return lines.slice(-count).join("\n");
  } finally {
    closeSync(fd);
  }
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * `extension`: the installed extension's folder. The helper removes the agent once that
 * folder is gone, since Raycast doesn't tell an extension it's being uninstalled.
 */
export function launchAgentPlist(helper: string, log: string, extension?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>${LABEL}</string>
	<key>ProgramArguments</key>
	<array>
		<string>${xml(helper)}</string>
		<string>listen</string>${extension ? `\n\t\t<string>--extension</string>\n\t\t<string>${xml(extension)}</string>` : ""}
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>KeepAlive</key>
	<true/>
	<key>ThrottleInterval</key>
	<integer>10</integer>
	<key>ProcessType</key>
	<string>Interactive</string>
	<key>StandardOutPath</key>
	<string>${xml(log)}</string>
	<key>StandardErrorPath</key>
	<string>${xml(log)}</string>
</dict>
</plist>
`;
}

export type AgentStatus = { state?: string; program?: string; pid?: number; runs?: number; lastExit?: string };

/** The fields of `launchctl print` that say whether the helper is actually running. */
export function parseLaunchctlPrint(text: string): AgentStatus {
  const field = (name: string) => new RegExp(`^\\t${name} = (.*)$`, "m").exec(text)?.[1];
  const number = (value?: string) => (value === undefined ? undefined : Number(value));
  return {
    state: field("state"),
    program: field("program"),
    pid: number(field("pid")),
    runs: number(field("runs")),
    lastExit: field("last exit code"),
  };
}

/** launchd's view of the agent; undefined when it isn't loaded. */
export async function agentStatus(): Promise<AgentStatus | undefined> {
  try {
    const { stdout } = await run("/bin/launchctl", ["print", `${domain()}/${LABEL}`]);
    return parseLaunchctlPrint(stdout);
  } catch {
    return undefined;
  }
}

/** Loaded into launchd; it may still be failing to start, see `agentStatus`. */
export async function isRunning(): Promise<boolean> {
  try {
    await run("/bin/launchctl", ["print", `${domain()}/${LABEL}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Raycast's store packaging drops file modes, so the bundled helper arrives
 * without its executable bit (spawn fails with EACCES). Restore it before use.
 */
export function ensureExecutable(helper: string) {
  if ((statSync(helper).mode & 0o111) !== 0o111) chmodSync(helper, 0o755);
}

export function helperInstallPath(env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const base = env.XDG_DATA_HOME || join(home, ".local", "share");
  return join(base, "genki-wave", "wave-helper");
}

/**
 * Copies the bundled helper to a stable place for launchd to run. Raycast replaces
 * the extension folder (and drops file modes) on every store update, which would
 * break the agent's automatic restarts; the copy keeps its path and its executable
 * bit, and is refreshed whenever the bundled helper changes. Returns its path.
 */
export function installHelper(bundled: string, env: NodeJS.ProcessEnv = process.env, home = homedir()): string {
  const installed = helperInstallPath(env, home);
  const same = existsSync(installed) && readFileSync(installed).equals(readFileSync(bundled));
  if (!same) {
    mkdirSync(dirname(installed), { recursive: true });
    // Replace atomically: a running listener keeps its own (old) file.
    const tmp = `${installed}.tmp`;
    copyFileSync(bundled, tmp);
    chmodSync(tmp, 0o755);
    renameSync(tmp, installed);
  }
  ensureExecutable(installed);
  return installed;
}

/**
 * Whether the installed agent already runs an up-to-date copy of `bundled`: its plist
 * points at the stable copy (not into the extension folder) and the copy matches.
 */
export function agentIsCurrent(
  bundled: string,
  agentPlist = plistPath(),
  env: NodeJS.ProcessEnv = process.env,
  home = homedir(),
  extension?: string,
): boolean {
  const installed = helperInstallPath(env, home);
  try {
    return (
      readFileSync(agentPlist, "utf8") === launchAgentPlist(installed, logPath(env, home), extension) &&
      readFileSync(installed).equals(readFileSync(bundled))
    );
  } catch {
    return false;
  }
}

/** Reinstalls a running agent that is outdated (e.g. after a store update); otherwise does nothing. */
/** `extension`: the installed extension's folder (see `launchAgentPlist`). */
export async function update(bundledHelper: string, extension?: string) {
  if (!(await isRunning()) || agentIsCurrent(bundledHelper, undefined, undefined, undefined, extension)) return;
  await stop();
  await start(bundledHelper, extension);
}

export async function start(bundledHelper: string, extension?: string) {
  const helper = installHelper(bundledHelper);
  const log = logPath();
  mkdirSync(dirname(log), { recursive: true });
  mkdirSync(dirname(plistPath()), { recursive: true });
  writeFileSync(plistPath(), launchAgentPlist(helper, log, extension));
  await bootstrap();
}

/**
 * Loads the agent. Already loaded counts as success: the menu bar and Configure Wave can
 * both start it at once. Right after a bootout launchd may still be removing the old job,
 * so a failure is retried once.
 */
async function bootstrap() {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run("/bin/launchctl", ["bootstrap", domain(), plistPath()]);
    } catch (e) {
      if (await isRunning()) return;
      if (attempt > 0) throw e;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

/** Unloads the agent, e.g. to reinstall it; the extension starts it again. */
export async function stop() {
  try {
    await run("/bin/launchctl", ["bootout", `${domain()}/${LABEL}`]);
  } catch (e) {
    // Already gone (stopped elsewhere) is what we wanted; anything else is a real failure.
    if (await isRunning()) throw e;
  }
  rmSync(plistPath(), { force: true });
}

/** Reconnect, e.g. to a newly chosen ring. A no-op when the listener isn't running. */
export async function restart() {
  if (!(await isRunning())) return;
  await run("/bin/launchctl", ["kickstart", "-k", `${domain()}/${LABEL}`]);
}

/** Ask the running listener to flash its ring, over its own connection. */
export async function identify() {
  await run("/bin/launchctl", ["kill", "SIGUSR1", `${domain()}/${LABEL}`]);
}
