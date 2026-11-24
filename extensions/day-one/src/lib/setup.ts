import { execFile } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runAppleScript } from "@raycast/utils";
import { INSTALL_COMMAND, IS_MAC, IS_WINDOWS } from "./cli";
import { isDemo } from "./demo";
import { findLegacyMcpServers, isLegacyCliTarget } from "./parse";

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

/** Runs a fixed command line through the user's login shell, so nvm, Homebrew and friends put `npm` on PATH. Never pass user input. */
export function runInLoginShell(command: string, timeout = 5 * 60_000): Promise<string> {
  if (isDemo()) return Promise.resolve("");
  const [file, args] = IS_WINDOWS
    ? ["cmd.exe", ["/d", "/s", "/c", command]]
    : [process.env.SHELL || "/bin/zsh", ["-ilc", command]];
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

export function installCli(): Promise<string> {
  return runInLoginShell(INSTALL_COMMAND);
}

export function updateCli(): Promise<string> {
  return runInLoginShell(`${INSTALL_COMMAND}@latest`);
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
