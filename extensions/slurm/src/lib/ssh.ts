import { execFile, spawn, ChildProcess } from "node:child_process";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { listHosts } from "./ssh-config";
import { SshError, makeHostNotInConfigError, toSshError } from "./errors";
import { DEMO_MODE, isDemoHost, mockRunSsh } from "./demo";
import { shellQuote } from "./shell";

export { SshError, SshAuthError } from "./errors";

const execFileP = promisify(execFile);

const SSH_BIN = "/usr/bin/ssh";
// macOS caps unix-socket sun_path at 104 bytes; %C expands to a 40-char SHA1,
// so the prefix needs to stay short. Using ~/Library/Caches/... overflows.
const CONTROL_DIR = path.join("/tmp", `raycast-slurm-${os.userInfo().uid ?? "u"}`);
const CONTROL_PATH = path.join(CONTROL_DIR, "ssh-%C");

function controlPersist(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.controlPersist?.trim() || "12h";
}

async function ensureControlDir(): Promise<void> {
  await fs.mkdir(CONTROL_DIR, { recursive: true, mode: 0o700 });
}

function commonOpts(): string[] {
  return [
    "-o",
    "ControlMaster=auto",
    "-o",
    `ControlPath=${CONTROL_PATH}`,
    "-o",
    `ControlPersist=${controlPersist()}`,
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ConnectTimeout=10",
  ];
}

function baseOpts(): string[] {
  return [...commonOpts(), "-o", "BatchMode=yes"];
}

// Hosts confirmed present in ~/.ssh/config for the lifetime of this process.
// Negative results are not memoized so the user can fix ~/.ssh/config and retry
// without restarting Raycast.
const knownHosts = new Set<string>();

async function requireHostInConfig(host: string): Promise<void> {
  if (DEMO_MODE && isDemoHost(host)) return;
  if (knownHosts.has(host)) return;
  const { hosts, state } = await listHosts();
  if (state.kind === "missing") {
    throw new SshError({
      kind: "host-not-in-config",
      host,
      title: "No ~/.ssh/config",
      message: `Cannot connect to '${host}' — your SSH config file is missing.`,
      hint: `Create ${state.path} with at least one Host entry.`,
      raw: `${state.path} does not exist`,
    });
  }
  if (state.kind === "unreadable") {
    throw new SshError({
      kind: "host-not-in-config",
      host,
      title: "Couldn't read ~/.ssh/config",
      message: state.reason,
      hint: `Fix permissions or syntax in ${state.path}.`,
      raw: state.reason,
    });
  }
  if (!hosts.some((h) => h.name === host)) {
    throw makeHostNotInConfigError(host);
  }
  knownHosts.add(host);
}

export async function isMasterUp(host: string): Promise<boolean> {
  if (DEMO_MODE && isDemoHost(host)) return true;
  await ensureControlDir();
  try {
    await requireHostInConfig(host);
    await execFileP(SSH_BIN, [...baseOpts(), "-O", "check", host], { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

export async function openMaster(host: string): Promise<void> {
  if (DEMO_MODE && isDemoHost(host)) return;
  await ensureControlDir();
  await requireHostInConfig(host);
  try {
    await execFileP(SSH_BIN, [...baseOpts(), "-fN", host], { timeout: 30_000 });
  } catch (err) {
    throw toSshError(err, host);
  }
}

export async function closeMaster(host: string): Promise<void> {
  if (DEMO_MODE && isDemoHost(host)) return;
  await ensureControlDir();
  try {
    await execFileP(SSH_BIN, [...baseOpts(), "-O", "exit", host], { timeout: 5_000 });
  } catch {
    /* already closed */
  }
}

export type RunOpts = { timeout?: number; maxBuffer?: number };

export async function runSsh(host: string, cmd: string, opts: RunOpts = {}): Promise<string> {
  if (DEMO_MODE && isDemoHost(host)) return mockRunSsh(host, cmd);
  await ensureControlDir();
  await requireHostInConfig(host);
  try {
    const { stdout } = await execFileP(SSH_BIN, [...baseOpts(), host, cmd], {
      timeout: opts.timeout ?? 15_000,
      maxBuffer: opts.maxBuffer ?? 16 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    throw toSshError(err, host);
  }
}

export function spawnSsh(host: string, cmd: string): ChildProcess {
  return spawn(SSH_BIN, [...baseOpts(), host, cmd], { stdio: ["ignore", "pipe", "pipe"] });
}

export function interactiveOpenMasterCmd(host: string): string {
  // Shown to the user when BatchMode auth fails (e.g. requires 2FA).
  // BatchMode=yes is omitted so ssh can prompt for password / 2FA in the terminal.
  return `ssh ${commonOpts().join(" ")} -fN ${shellQuote(host)}`;
}

// AppleScript string literals interpret `\\` and `\"`; escape backslashes
// first so we don't double-escape the slashes we just inserted.
function escapeAppleScriptString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function openMasterInTerminal(host: string): Promise<void> {
  if (DEMO_MODE && isDemoHost(host)) return;
  const cmd = interactiveOpenMasterCmd(host);
  await runAppleScript(`
    tell application "Terminal"
      activate
      do script "${escapeAppleScriptString(cmd)}"
    end tell
  `);
}
