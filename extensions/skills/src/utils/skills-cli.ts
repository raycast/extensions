import { homedir } from "node:os";
import type { InstalledSkill, Skill } from "../shared";
import { agentDisplayNameToId, KNOWN_AGENT_NAMES } from "./skills-cli-agents";
import { readSkillLock } from "./skill-lock";
import { isVerifiedCliSkill, safeMutableAgents } from "./skill-ownership";
import {
  InvalidCustomNpxPathError,
  NpxResolutionError,
  SkillsCliBusyError,
  isInvalidCustomNpxPathError,
  isNpxResolutionError,
  isSkillsCliBusyError,
  runSkillsCli,
  stripAnsiEscapes,
  withSkillsCliLock,
  type SkillsCliRunner,
} from "./skills-cli-runner";

const home = homedir();

const MAX_UNEXPECTED_OUTPUT_CHARS = 500;

export {
  InvalidCustomNpxPathError,
  NpxResolutionError,
  SkillsCliBusyError,
  isInvalidCustomNpxPathError,
  isNpxResolutionError,
  isSkillsCliBusyError,
  KNOWN_AGENT_NAMES,
};

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

export async function listInstalledSkills(runCli: SkillsCliRunner = runSkillsCli): Promise<InstalledSkill[]> {
  const stdout = await runCli(["list", "-g", "--json"], { readOnly: true });
  try {
    return parseSkillsListJson(stdout);
  } catch (error) {
    const output = stripAnsiEscapes(stdout).trim();
    const excerpt =
      output.length > MAX_UNEXPECTED_OUTPUT_CHARS ? `${output.slice(0, MAX_UNEXPECTED_OUTPUT_CHARS)}…` : output;
    throw new Error(
      `Failed to parse skills list: unexpected output from \`skills list --json\`\n${excerpt || "(no output)"}`,
      { cause: error },
    );
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

export interface AgentDiscoveryResult {
  agents: string[];
  /**
   * Maps installed skill name -> agents it is installed on.
   * Keyed by the CLI's `name` field from `skills list --json`, which matches
   * the `skillId` used in `skills add source@skillId`.
   */
  skillAgentMap: Record<string, string[]>;
}

export async function discoverAgents(): Promise<AgentDiscoveryResult> {
  const agentSet = new Set<string>(KNOWN_AGENT_NAMES);
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

async function verifiedManagedSkill(skillName: string, runLocked: SkillsCliRunner): Promise<InstalledSkill> {
  const lock = await readSkillLock();
  const skill = (await listInstalledSkills(runLocked)).find((item) => item.name === skillName);
  if (!skill || !(await isVerifiedCliSkill(skill, lock[skillName]))) {
    throw new Error(`"${skillName}" is no longer a verified Skills CLI installation. Refresh the list.`);
  }
  return skill;
}

export async function removeSkill(skillName: string, agentDisplayNames: string[]): Promise<void> {
  await withSkillsCliLock(async (runLocked) => {
    const skill = await verifiedManagedSkill(skillName, runLocked);
    const safe = await safeMutableAgents(skillName, skill.agents);
    if (!agentDisplayNames.length || agentDisplayNames.some((agent) => !safe.includes(agent))) {
      throw new Error("Only verified Codex or Claude Code installations can be removed here. Refresh the list.");
    }
    const args = ["remove", skillName, "-g", "-a", ...agentDisplayNames.map(agentDisplayNameToId)];
    args.push("-y");
    await runLocked(args);
  });
}
