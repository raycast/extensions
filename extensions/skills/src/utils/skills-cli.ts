import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { getCustomNpxPath } from "../preferences";
import type { InstalledSkill, Skill, SkillLockEntry } from "../shared";
import { execAsync } from "./exec-async";
import { getExecOptions } from "./exec-options";

const home = homedir();
const isWindows = process.platform === "win32";

type ExecFailure = Error & {
  code?: string | number;
  stderr?: string;
};

export class NpxResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NpxResolutionError";
  }
}

export function isNpxResolutionError(error: unknown): boolean {
  return error instanceof NpxResolutionError;
}

function buildSkillsCliCommand(npxCommand: string, args: string[]): string {
  return [npxCommand, "-y", "skills@latest", ...args].map(shellEscape).join(" ");
}

async function runSkillsCli(args: string[]): Promise<string> {
  const npxCommand = getCustomNpxPath() ?? "npx";
  try {
    const { stdout } = await execAsync(buildSkillsCliCommand(npxCommand, args), await getExecOptions());
    return stdout;
  } catch (error) {
    throw normalizeCliError(error, npxCommand);
  }
}

// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\x1B\[[0-9;]*m/g;

/**
 * Strip ANSI escape codes from CLI output.
 * Used by checkForUpdates() which does not have a --json option.
 */
export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, "");
}

/** Escape a value for safe use as a shell argument. */
export function shellEscape(arg: string): string {
  if (isWindows) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

export function normalizeCliError(error: unknown, npxCommand: string): Error {
  if (isNpxCommandResolutionFailure(error, npxCommand)) {
    return new NpxResolutionError(
      "Unable to find a working npx command. Run `which npx` in Terminal, then set that path in Extension Preferences under 'Custom npx Path'.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Failed to execute the skills CLI command.");
}

function isNpxCommandResolutionFailure(error: unknown, npxCommand: string): boolean {
  const failure = error as ExecFailure | undefined;
  const code = typeof failure?.code === "string" || typeof failure?.code === "number" ? String(failure.code) : "";
  const details = [failure?.message, failure?.stderr]
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .toLowerCase();
  const normalizedNpxCommand = npxCommand.toLowerCase();
  const commandBase = basename(normalizedNpxCommand).replace(/\.exe$/, "");
  const windowsCommandNotFound = `'${commandBase}' is not recognized as an internal or external command`;

  const mentionsCommand =
    details.includes(`spawn ${normalizedNpxCommand} `) ||
    details.includes(`spawn ${commandBase} `) ||
    details.includes(`command not found: ${commandBase}`) ||
    details.includes(`${commandBase}: command not found`) ||
    details.includes(windowsCommandNotFound);

  return (
    (code === "ENOENT" && mentionsCommand) ||
    details.includes(`spawn ${normalizedNpxCommand} enoent`) ||
    details.includes(`spawn ${commandBase} enoent`) ||
    details.includes(`command not found: ${commandBase}`) ||
    details.includes(`${commandBase}: command not found`) ||
    details.includes(windowsCommandNotFound)
  );
}

/** Shape of each entry from `skills list --json` */
interface SkillsListJsonEntry {
  name: string;
  path: string;
  scope: string;
  agents: string[];
}

export function parseSkillsListJson(stdout: string): InstalledSkill[] {
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
  const stdout = await runSkillsCli(["list", "-g", "--json"]);
  try {
    return parseSkillsListJson(stdout);
  } catch {
    throw new Error("Failed to parse skills list: unexpected output from `skills list --json`");
  }
}

export async function installSkill(skill: Skill, agentDisplayNames?: string[]): Promise<void> {
  const args = ["add", `${skill.source}@${skill.skillId}`, "-g"];
  if (agentDisplayNames && agentDisplayNames.length > 0) {
    args.push("-a", ...agentDisplayNames.map(agentDisplayNameToId));
  }
  args.push("-y");
  await runSkillsCli(args);
}

/**
 * Display name → CLI agent ID for all agents supported by the Skills CLI.
 * Sourced from https://github.com/vercel-labs/skills/blob/main/src/agents.ts
 * Dynamically discovered agents fall back to the default transform (lowercase + space→hyphen).
 */
const AGENT_DISPLAY_TO_ID = new Map<string, string>([
  ["AdaL", "adal"],
  ["Amp", "amp"],
  ["Antigravity", "antigravity"],
  ["Augment", "augment"],
  ["Claude Code", "claude-code"],
  ["Cline", "cline"],
  ["CodeBuddy", "codebuddy"],
  ["Codex", "codex"],
  ["Command Code", "command-code"],
  ["Continue", "continue"],
  ["Cortex Code", "cortex"],
  ["Crush", "crush"],
  ["Cursor", "cursor"],
  ["Deep Agents", "deepagents"],
  ["Droid", "droid"],
  ["Firebender", "firebender"],
  ["Gemini CLI", "gemini-cli"],
  ["GitHub Copilot", "github-copilot"],
  ["Goose", "goose"],
  ["iFlow CLI", "iflow-cli"],
  ["Junie", "junie"],
  ["Kilo Code", "kilo"],
  ["Kimi Code CLI", "kimi-cli"],
  ["Kiro CLI", "kiro-cli"],
  ["Kode", "kode"],
  ["MCPJam", "mcpjam"],
  ["Mistral Vibe", "mistral-vibe"],
  ["Mux", "mux"],
  ["Neovate", "neovate"],
  ["OpenClaw", "openclaw"],
  ["OpenCode", "opencode"],
  ["OpenHands", "openhands"],
  ["Pi", "pi"],
  ["Pochi", "pochi"],
  ["Qoder", "qoder"],
  ["Qwen Code", "qwen-code"],
  ["Replit", "replit"],
  ["Roo Code", "roo"],
  ["Trae", "trae"],
  ["Trae CN", "trae-cn"],
  ["Warp", "warp"],
  ["Windsurf", "windsurf"],
  ["Zencoder", "zencoder"],
]);

export function agentDisplayNameToId(displayName: string): string {
  return AGENT_DISPLAY_TO_ID.get(displayName) ?? displayName.toLowerCase().replace(/\s+/g, "-");
}

/** Sorted known agent display names, used as synchronous initial data before the CLI responds. */
export const KNOWN_AGENT_NAMES: string[] = [...AGENT_DISPLAY_TO_ID.keys()].sort();

export interface AgentDiscoveryResult {
  agents: string[];
  /**
   * Maps installed skill name → agents it is installed on.
   * Keyed by the CLI's `name` field from `skills list --json`, which matches
   * the `skillId` used in `skills add source@skillId`.
   */
  skillAgentMap: Record<string, string[]>;
}

export async function discoverAgents(): Promise<AgentDiscoveryResult> {
  const agentSet = new Set<string>(AGENT_DISPLAY_TO_ID.keys());
  const skillAgentMap: Record<string, string[]> = {};
  try {
    const skills = await listInstalledSkills();
    for (const skill of skills) {
      skillAgentMap[skill.name] = skill.agents;
      for (const agent of skill.agents) {
        agentSet.add(agent);
      }
    }
  } catch {
    // Fall back to the hardcoded list.
  }
  return { agents: [...agentSet].sort(), skillAgentMap };
}

export async function removeSkill(skillName: string, agentDisplayNames?: string[]): Promise<void> {
  const args = ["remove", skillName, "-g"];
  if (agentDisplayNames && agentDisplayNames.length > 0) {
    args.push("-a", ...agentDisplayNames.map(agentDisplayNameToId));
  }
  args.push("-y");
  await runSkillsCli(args);
}

/**
 * Check for available skill updates.
 * Parses `npx -y skills@latest check` output for "↑ skillName" lines.
 */
export async function checkForUpdates(): Promise<string[]> {
  const stdout = await runSkillsCli(["check"]);
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
  await runSkillsCli(["update", "-y"]);
}

const LOCK_FILE = ".skill-lock.json";
const AGENTS_DIR = ".agents";

function getSkillLockPath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  if (xdgStateHome) return join(xdgStateHome, "skills", LOCK_FILE);
  return join(home, AGENTS_DIR, LOCK_FILE);
}

export async function readSkillLock(): Promise<Record<string, SkillLockEntry>> {
  try {
    const raw = await readFile(getSkillLockPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.skills === "object" && parsed.skills !== null) {
      return parsed.skills as Record<string, SkillLockEntry>;
    }
    return {};
  } catch {
    return {};
  }
}
