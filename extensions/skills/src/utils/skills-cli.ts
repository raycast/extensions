import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { getCustomNpxPath, getGithubToken, shouldDisableSkillsCliTelemetry } from "../preferences";
import type { InstalledSkill, Skill, SkillLockEntry } from "../shared";
import { execAsync } from "./exec-async";
import { getExecOptions } from "./exec-options";

const home = homedir();
const isWindows = process.platform === "win32";

let validatedCustomNpxPath: string | null = null;
let pendingCustomNpxValidation: { path: string; promise: Promise<void> } | null = null;
let pendingSkillsCliRun: Promise<unknown> = Promise.resolve();
let bunxResolutionFailed = false;

type ExecFailure = Error & {
  code?: string | number;
  stderr?: string;
};

type PackageRunner = "npx" | "bunx";

export class NpxResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NpxResolutionError";
  }
}

export function isNpxResolutionError(error: unknown): boolean {
  return error instanceof NpxResolutionError;
}

export class InvalidCustomNpxPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCustomNpxPathError";
  }
}

export function isInvalidCustomNpxPathError(error: unknown): boolean {
  return error instanceof InvalidCustomNpxPathError;
}

function buildSkillsCliCommand(runner: PackageRunner, args: string[], executable: string = runner): string {
  const runnerArgs = runner === "npx" ? ["-y", "skills@latest"] : ["--silent", "skills@latest"];
  return [executable, ...runnerArgs, ...args].map(shellEscape).join(" ");
}

function getSkillsCliEnvOverrides(): Record<string, string> {
  return shouldDisableSkillsCliTelemetry() ? { DISABLE_TELEMETRY: "1" } : {};
}

async function runSkillsCli(args: string[]): Promise<string> {
  return enqueueSkillsCliRun(() => runSkillsCliCommand(args));
}

async function enqueueSkillsCliRun<T>(run: () => Promise<T>): Promise<T> {
  const runAfterPending = pendingSkillsCliRun.then(run, run);
  pendingSkillsCliRun = runAfterPending.catch(() => undefined);
  return runAfterPending;
}

async function runSkillsCliCommand(args: string[]): Promise<string> {
  const customNpxPath = getCustomNpxPath();
  if (customNpxPath) {
    await validateCustomNpxPath(customNpxPath);

    const execOptions = await getExecOptions();
    try {
      const { stdout } = await execAsync(buildSkillsCliCommand("npx", args, customNpxPath), execOptions);
      return stdout;
    } catch (error) {
      throw normalizeCliError(error, customNpxPath);
    }
  }

  if (!bunxResolutionFailed) {
    try {
      const execOptions = await getExecOptions();
      const { stdout } = await execAsync(buildSkillsCliCommand("bunx", args), execOptions);
      return stdout;
    } catch (error) {
      if (!isNpxCommandResolutionFailure(error, "bunx")) {
        throw normalizeCliError(error, "bunx");
      }
      bunxResolutionFailed = true;
    }
  }

  try {
    const execOptions = await getExecOptions();
    execOptions.env = {
      ...execOptions.env,
      ...getSkillsCliEnvOverrides(),
    };
    const { stdout } = await execAsync(buildSkillsCliCommand("npx", args), execOptions);
    return stdout;
  } catch (npxError) {
    throw normalizeCliError(npxError, "npx");
  }
}

/** Escape a value for safe use as a shell argument. */
function shellEscape(arg: string): string {
  if (isWindows) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

function normalizeCliError(error: unknown, npxCommand: string): Error {
  if (isNpxCommandResolutionFailure(error, npxCommand)) {
    return new NpxResolutionError(
      "Unable to find a working bunx or npx command. Install Bun, or install Node.js/npm. If you need to force a custom npx executable, set it in the extension configuration under 'Custom npx Path'.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Failed to execute the skills CLI command.");
}

async function validateCustomNpxPath(customNpxPath: string): Promise<void> {
  if (validatedCustomNpxPath === customNpxPath) {
    return;
  }

  if (pendingCustomNpxValidation?.path === customNpxPath) {
    return pendingCustomNpxValidation.promise;
  }

  const validationPromise = assertValidCustomNpxPath(customNpxPath);
  pendingCustomNpxValidation = { path: customNpxPath, promise: validationPromise };

  try {
    await validationPromise;
    validatedCustomNpxPath = customNpxPath;
  } finally {
    if (pendingCustomNpxValidation?.path === customNpxPath) {
      pendingCustomNpxValidation = null;
    }
  }
}

async function assertValidCustomNpxPath(customNpxPath: string): Promise<void> {
  const invalidPathMessage =
    "The configured Custom npx Path is incorrect. It must point to the `npx` executable. Update the path in the extension configuration or clear it to use automatic detection.";

  const executableNames = isWindows ? new Set(["npx", "npx.cmd", "npx.exe"]) : new Set(["npx"]);
  if (!executableNames.has(basename(customNpxPath).toLowerCase())) {
    throw new InvalidCustomNpxPathError(invalidPathMessage);
  }

  let fileStats;
  try {
    fileStats = await stat(customNpxPath);
  } catch {
    throw new InvalidCustomNpxPathError(invalidPathMessage);
  }
  if (fileStats.isDirectory()) {
    throw new InvalidCustomNpxPathError(invalidPathMessage);
  }

  if (!isWindows) {
    try {
      await access(customNpxPath, constants.X_OK);
    } catch {
      throw new InvalidCustomNpxPathError(invalidPathMessage);
    }
  }
}

function isNpxCommandResolutionFailure(error: unknown, npxCommand: string): boolean {
  const failure = error as ExecFailure | undefined;
  const code = typeof failure?.code === "string" || typeof failure?.code === "number" ? String(failure.code) : "";
  const details = [failure?.message, failure?.stderr]
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .toLowerCase();
  const normalizedNpxCommand = npxCommand.toLowerCase();
  const commandBase = basename(normalizedNpxCommand).replace(/\.(cmd|exe)$/, "");
  const windowsCommandNotFound = `'${commandBase}' is not recognized as an internal or external command`;
  // cmd.exe echoes the command name with its surrounding double quotes from the shell-escaped invocation,
  // so the error reads `'"bunx"' is not recognized...` when bunx is missing.
  const windowsCommandNotFoundQuoted = `'"${commandBase}"' is not recognized as an internal or external command`;

  const mentionsCommand =
    details.includes(`spawn ${normalizedNpxCommand} `) ||
    details.includes(`spawn ${commandBase} `) ||
    details.includes(`command not found: ${commandBase}`) ||
    details.includes(`${commandBase}: command not found`) ||
    details.includes(windowsCommandNotFound) ||
    details.includes(windowsCommandNotFoundQuoted);

  const npxShimModuleNotFound =
    commandBase === "npx" &&
    details.includes("cannot find module") &&
    (details.includes("npm-prefix.js") || details.includes("npx-cli.js"));

  return (
    (code === "ENOENT" && mentionsCommand) ||
    npxShimModuleNotFound ||
    details.includes(`spawn ${normalizedNpxCommand} enoent`) ||
    details.includes(`spawn ${commandBase} enoent`) ||
    details.includes(`command not found: ${commandBase}`) ||
    details.includes(`${commandBase}: command not found`) ||
    details.includes(windowsCommandNotFound) ||
    details.includes(windowsCommandNotFoundQuoted)
  );
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

function agentDisplayNameToId(displayName: string): string {
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

interface GitHubTreeResponse {
  sha: string;
  tree: Array<{ path: string; sha: string; type: string }>;
  truncated?: boolean;
}

async function fetchRepoTree(source: string, token: string | undefined): Promise<GitHubTreeResponse | null> {
  const [owner, repo] = source.split("/");
  if (!owner || !repo) return null;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  for (const branch of ["main", "master"]) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
      headers,
    });
    if (res.ok) {
      const data = (await res.json()) as GitHubTreeResponse;
      if (data.truncated) return null;
      return data;
    }
    if (res.status === 403 || res.status === 429) return null;
  }
  return null;
}

/**
 * Implemented against the GitHub Trees API rather than `npx skills check` because
 * the CLI's check command reinstalls outdated skills as a side effect since v1.5.0.
 */
export async function checkForUpdates(): Promise<string[]> {
  const lock = await readSkillLock();
  const entries = Object.entries(lock).filter(([, e]) => e.sourceType === "github" && e.skillFolderHash && e.skillPath);
  if (entries.length === 0) return [];

  const byRepo = new Map<string, Array<{ name: string; skillPath: string; expectedHash: string }>>();
  for (const [name, entry] of entries) {
    const list = byRepo.get(entry.source) ?? [];
    list.push({ name, skillPath: entry.skillPath, expectedHash: entry.skillFolderHash });
    byRepo.set(entry.source, list);
  }

  const githubToken = getGithubToken();

  const results = await Promise.all(
    [...byRepo.entries()].map(async ([source, skills]) => {
      try {
        const tree = await fetchRepoTree(source, githubToken);
        if (!tree) return [];
        const { sha: rootSha, tree: entries } = tree;
        return skills.flatMap((skill) => {
          const folder = skill.skillPath.replace(/\/?SKILL\.md$/, "");
          const upstreamSha = folder ? entries.find((t) => t.path === folder && t.type === "tree")?.sha : rootSha;
          return upstreamSha && upstreamSha !== skill.expectedHash ? [skill.name] : [];
        });
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}

/**
 * Update all installed skills.
 */
export async function updateAllSkills(): Promise<void> {
  await runSkillsCli(["update", "-y"]);
}

/**
 * Update a single installed skill by name.
 * Runs `skills update <skill-name> -y` via the resolved package runner (bunx with npx fallback).
 */
export async function updateSkill(skillName: string): Promise<void> {
  await runSkillsCli(["update", skillName, "-y"]);
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
