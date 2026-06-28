import { homedir } from "node:os";
import type { InstalledSkill, Skill } from "../shared";
import { agentDisplayNameToId, KNOWN_AGENT_NAMES } from "./skills-cli-agents";
import {
  InvalidCustomNpxPathError,
  NpxResolutionError,
  isInvalidCustomNpxPathError,
  isNpxResolutionError,
  runSkillsCli,
} from "./skills-cli-runner";

const home = homedir();

export {
  InvalidCustomNpxPathError,
  NpxResolutionError,
  isInvalidCustomNpxPathError,
  isNpxResolutionError,
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

export async function removeSkill(skillName: string, agentDisplayNames?: string[]): Promise<void> {
  const args = ["remove", skillName, "-g"];
  if (agentDisplayNames && agentDisplayNames.length > 0) {
    args.push("-a", ...agentDisplayNames.map(agentDisplayNameToId));
  }
  args.push("-y");
  await runSkillsCli(args);
}

export async function updateAllSkills(): Promise<void> {
  await runSkillsCli(["update", "-g", "-y"]);
}

export async function updateSkill(skillName: string): Promise<void> {
  await runSkillsCli(["update", skillName, "-g", "-y"]);
}
