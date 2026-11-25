import { execFile } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runAppleScript } from "@raycast/utils";
import { INSTALL_COMMAND, IS_MAC, IS_WINDOWS } from "./cli";
import { isDemo } from "./demo";
import { detachedJob, safeRead } from "./jobs";
import { findLegacyMcpServers, INSTALL_EXIT_MARK, installExitCode, isLegacyCliTarget } from "./parse";

const LEGACY_CLI_PATH = "/usr/local/bin/dayone";
export const RENAMED_LEGACY_CLI_PATH = "/usr/local/bin/dayone-mac";
export const RENAME_COMMAND = `sudo mv -n ${LEGACY_CLI_PATH} ${RENAMED_LEGACY_CLI_PATH}`;
export const SKILLS_COMMAND = "npx --yes skills add bloom/dayone-cli-skills --global --yes";
export const SKILLS_REPO_URL = "https://github.com/bloom/dayone-cli-skills";

/** The skills CLI installs to ~/.agents/skills and links each agent's folder (~/.claude/skills, …) to it. */
export function agentSkillsInstalled(): boolean {
  if (isDemo()) return true;
  const home = homedir();
  return [join(home, ".agents", "skills", "dayone-cli"), join(home, ".claude", "skills", "dayone-cli")].some((dir) =>
    existsSync(join(dir, "SKILL.md")),
  );
}

/** The user's login shell running a fixed command line, so nvm, Homebrew and friends put `npm` on PATH. Never pass user input. */
function loginShell(command: string): [file: string, argv: string[]] {
  return IS_WINDOWS ? ["cmd.exe", ["/d", "/s", "/c", command]] : [process.env.SHELL || "/bin/zsh", ["-ilc", command]];
}

export function runInLoginShell(command: string, timeout = 5 * 60_000): Promise<string> {
  if (isDemo()) return Promise.resolve("");
  const [file, args] = loginShell(command);
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout, maxBuffer: 16 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
      if (error) reject(new Error(lastLines(stderr) || error.message));
      else resolve(stdout);
    });
  });
}

function lastLines(text: string, count = 6): string {
  return text.trim().split("\n").slice(-count).join("\n");
}

/**
 * Installing and updating run detached as one job: two `npm install -g` runs at once can leave the package
 * half-written, and Doctor's in-memory guard is gone once it's closed and opened again. A second request while one
 * runs joins it instead of starting another, and a later launch can see it's still going.
 */
// An hour, like sync: past it, a run still alive is treated as hung, and a new install may start beside it.
const installJob = detachedJob("cli-install", 60 * 60_000, (stdout) => installExitCode(stdout) !== null);

export function isCliInstallRunning(): boolean {
  return !isDemo() && installJob.isRunning();
}

export type CliInstallResult = { update: boolean } & ({ ok: true } | { ok: false; error: string });

// Each install's result is reported once, like a rebuild's: by the Doctor that is waiting on it, or else by the next
// Doctor to open. `awaiting` keeps this process's tick off a result its own waiter reports. `abandoned` is set when
// that Doctor closes, so a waiter left behind doesn't claim a result nobody would see.
let awaiting = false;
let abandoned = false;

/** Thrown to a closed Doctor's waiter: the next Doctor to open reports the result, so this one stays quiet. */
export class InstallHandedOff extends Error {}

/** Doctor calls this when it closes. */
export function abandonInstallWait(): void {
  awaiting = false;
  abandoned = true;
}

/** The latest install's result, or null when none has run or it is still running. */
function installResult(): CliInstallResult | null {
  const run = installJob.readRun();
  if (isDemo() || !run || installJob.isRunning()) return null;
  const update = run.meta?.update === 1;
  return installExitCode(installJob.output()) === 0
    ? { update, ok: true }
    : {
        update,
        ok: false,
        error: lastLines(safeRead(installJob.files().log)) || "The install stopped before it finished",
      };
}

/** Marks the latest install as reported. False when it already was. */
function claimInstallNews(): boolean {
  const startedAt = installJob.startedAt();
  if (startedAt === null) return false;
  const announced = join(installJob.files().dir, "announced");
  if (safeRead(announced) === String(startedAt)) return false;
  writeFileSync(announced, String(startedAt));
  return true;
}

/** An install's result that no one has reported yet, once. Null while this process is waiting on it. */
export function takeCliInstallNews(): CliInstallResult | null {
  if (awaiting) return null;
  const result = installResult();
  return result && claimInstallNews() ? result : null;
}

/** `&&`/`||` mean the same in sh and cmd.exe, so the marker records npm's result on both. */
async function runInstall(command: string, update: boolean): Promise<void> {
  if (isDemo()) return;
  if (!installJob.isRunning()) {
    await installJob.start([], {
      command: loginShell(`${command} && echo ${INSTALL_EXIT_MARK}0 || echo ${INSTALL_EXIT_MARK}1`),
      meta: { update: update ? 1 : 0 },
    });
  }
  awaiting = true;
  abandoned = false;
  try {
    while (installJob.isRunning()) await new Promise((resolve) => setTimeout(resolve, 500));
  } finally {
    awaiting = false;
  }
  // Left behind by a closed Doctor: the next one to open reports it instead.
  if (abandoned) throw new InstallHandedOff("The next Doctor reports this install");
  const result = installResult();
  claimInstallNews();
  if (!result) throw new Error("The install stopped before it finished");
  if (!result.ok) throw new Error(result.error);
}

export function installCli(): Promise<void> {
  return runInstall(INSTALL_COMMAND, false);
}

export function updateCli(): Promise<void> {
  return runInstall(`${INSTALL_COMMAND}@latest`, true);
}

export function installAgentSkills(): Promise<string> {
  return runInLoginShell(SKILLS_COMMAND);
}

export type LegacyState = "none" | "present" | "renamed";

/** The legacy CLI is a symlink into Day One.app. A `dayone` here that points anywhere else is the new CLI (Homebrew Node on Intel installs there). */
export function legacyCliState(): LegacyState {
  if (!IS_MAC || isDemo()) return "none";
  if (pointsIntoDayOneApp(LEGACY_CLI_PATH)) return "present";
  if (existsSync(RENAMED_LEGACY_CLI_PATH)) return "renamed";
  return "none";
}

function pointsIntoDayOneApp(path: string): boolean {
  try {
    if (!lstatSync(path).isSymbolicLink()) return false;
    return isLegacyCliTarget(readlinkSync(path));
  } catch {
    return false;
  }
}

/** Renames the legacy CLI with macOS's administrator prompt. `mv -n` never overwrites an existing dayone-mac. */
export async function renameLegacyCli(): Promise<void> {
  if (isDemo()) return;
  const script = `do shell script "/bin/mv -n ${LEGACY_CLI_PATH} ${RENAMED_LEGACY_CLI_PATH}" with administrator privileges`;
  try {
    // The administrator prompt waits on the person, so allow longer than the default 10 seconds.
    await runAppleScript(script, { timeout: 120_000 });
  } catch (error) {
    const stderr = String((error as { stderr?: unknown }).stderr ?? "");
    throw new Error(stderr.includes("(-128)") ? "Canceled" : stderr.trim() || (error as Error).message);
  }
  // `mv -n` exits 0 without moving when dayone-mac already exists, so check that the old CLI actually moved.
  if (pointsIntoDayOneApp(LEGACY_CLI_PATH)) {
    throw new Error(`${RENAMED_LEGACY_CLI_PATH} already exists, so ${LEGACY_CLI_PATH} wasn't moved`);
  }
}

export type McpConfigFinding = { file: string; servers: string[] };

/** MCP clients configured to run `dayone mcp` stop working after the rename; they need `dayone-mac mcp`. Read-only. */
export function legacyMcpConfigs(): McpConfigFinding[] {
  if (!IS_MAC || isDemo()) return [];
  const home = homedir();
  const files = [
    join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    join(home, ".claude.json"),
    join(home, ".cursor", "mcp.json"),
  ];
  const findings: McpConfigFinding[] = [];
  for (const file of files) {
    try {
      const servers = findLegacyMcpServers(JSON.parse(readFileSync(file, "utf8")));
      if (servers.length) findings.push({ file, servers });
    } catch {
      // Missing or unreadable config: nothing to report.
    }
  }
  return findings;
}
