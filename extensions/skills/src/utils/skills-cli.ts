import { exec } from "child_process";
import { promisify } from "util";
import { homedir } from "os";
import type { InstalledSkill, Skill } from "../shared";

const execAsync = promisify(exec);
const home = homedir();
const isWindows = process.platform === "win32";
const SKILLS_CLI = "npx -y skills@latest";

/**
 * Run a CLI command with the user's full PATH.
 * - macOS/Linux: wraps in `zsh -l -c` so PATH includes mise, nvm, homebrew, etc.
 * - Windows: runs directly via cmd since PATH is inherited.
 */
function execWithPath(command: string) {
  if (isWindows) {
    return execAsync(command);
  }
  return execAsync(`zsh -l -c ${shellEscape(command)}`);
}

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*m/g;

/**
 * Strip ANSI escape codes from CLI output.
 * Used by checkForUpdates() which does not have a --json option.
 */
function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

/** Escape a value for safe use as a shell argument. */
function shellEscape(arg: string): string {
  if (isWindows) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/** Shape of each entry from `skills list --json` */
interface SkillsListJsonEntry {
  name: string;
  path: string;
  scope: string;
  agents: string[];
}

function parseSkillsListJson(stdout: string): InstalledSkill[] {
  const entries: unknown = JSON.parse(stdout);
  if (!Array.isArray(entries)) {
    throw new Error("Expected JSON array");
  }
  return (entries as SkillsListJsonEntry[]).map((entry) => ({
    name: entry.name,
    path: entry.path.startsWith("~") ? entry.path.replace("~", home) : entry.path,
    agents: entry.agents,
    agentCount: entry.agents.length,
  }));
}

export async function listInstalledSkills(): Promise<InstalledSkill[]> {
  const { stdout } = await execWithPath(`${SKILLS_CLI} list -g --json`);
  try {
    return parseSkillsListJson(stdout);
  } catch {
    throw new Error("Failed to parse skills list: unexpected output from `skills list --json`");
  }
}

export async function installSkill(skill: Skill): Promise<void> {
  await execWithPath(`${SKILLS_CLI} add ${shellEscape(`${skill.source}@${skill.skillId}`)} -g -y`);
}

export async function removeSkill(skillName: string): Promise<void> {
  await execWithPath(`${SKILLS_CLI} remove ${shellEscape(skillName)} -g -y`);
}

/**
 * Check for available skill updates.
 * Parses `npx -y skills@latest check` output for "↑ skillName" lines.
 */
export async function checkForUpdates(): Promise<string[]> {
  const { stdout } = await execWithPath(`${SKILLS_CLI} check`);
  return stripAnsi(stdout)
    .split("\n")
    .map((line) => line.match(/↑\s+(\S+)/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1]);
}

/**
 * Update all installed skills.
 */
export async function updateAllSkills(): Promise<void> {
  await execWithPath(`${SKILLS_CLI} update -y`);
}
