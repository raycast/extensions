import { NETWORK_TIMEOUT, runCli } from "./cli";
import {
  Agent,
  CheckResult,
  DeployResult,
  Preset,
  PresetStatus,
  RepoStatus,
  SearchResult,
  Skill,
  SkillDetail,
  SkillStatus,
  UpdateResult,
} from "./types";

/**
 * One function per CLI operation the extension is allowed to perform.
 *
 * Deliberately absent, per the extension's scope: the `git` command group,
 * the legacy `skills sync` / `presets apply` / `presets deactivate` workflow,
 * the deprecated `skills enable` / `skills disable`, and `set-source --force`.
 */

export interface SkillFilter {
  tag?: string;
  preset?: string;
  deployedTo?: string;
  source?: string;
  untagged?: boolean;
  noPreset?: boolean;
}

export function listSkills(filter: SkillFilter = {}): Promise<Skill[]> {
  const args = ["skills", "list"];
  if (filter.tag) args.push("--tag", filter.tag);
  if (filter.preset) args.push("--preset", filter.preset);
  if (filter.deployedTo) args.push("--deployed-to", filter.deployedTo);
  if (filter.source) args.push("--source", filter.source);
  if (filter.untagged) args.push("--untagged");
  if (filter.noPreset) args.push("--no-preset");
  return runCli<Skill[]>(args);
}

export function showSkill(ref: string): Promise<SkillDetail> {
  return runCli<SkillDetail>(["skills", "show", ref]);
}

export function skillStatus(ref: string): Promise<SkillStatus> {
  return runCli<SkillStatus>(["skills", "status", ref]);
}

export function searchSkills(query: string, limit = 15): Promise<SearchResult[]> {
  return runCli<SearchResult[]>(["skills", "search", query, "--limit", String(limit)], { timeout: NETWORK_TIMEOUT });
}

/**
 * Installs into the central library only — the skill will not appear in any
 * agent until it is deployed. Callers must offer that follow-up.
 */
export function installSkill(ref: string): Promise<InstallResult> {
  return runCli<InstallResult>(["skills", "install", ref], { timeout: NETWORK_TIMEOUT });
}

/** `skills install` reports what it created as an InstallReport. */
interface InstallResult {
  skill_id?: string;
  /** The library directory name, which is de-duplicated and so may differ from the marketplace name. */
  name?: string;
}

/**
 * The reference to deploy after installing.
 *
 * Uses the id the install reports. The marketplace name is not a safe
 * reference: it is not unique in the library, and the CLI may have stored this
 * copy under a de-duplicated name (`foo-2`). The reported `name` is that stored
 * name, so it is a sound second choice; the marketplace name is a last resort.
 */
export function installedRef(result: InstallResult | undefined, fallbackName: string): string {
  return result?.skill_id ?? result?.name ?? fallbackName;
}

export function deploySkills(refs: string[], agents: string[], dryRun = false): Promise<DeployResult> {
  const args = ["skills", "deploy", ...refs];
  for (const agent of agents) args.push("--agent", agent);
  if (dryRun) args.push("--dry-run");
  return runCli<DeployResult>(args);
}

export function undeploySkills(refs: string[], agents: string[], dryRun = false): Promise<DeployResult> {
  const args = ["skills", "undeploy", ...refs];
  for (const agent of agents) args.push("--agent", agent);
  if (dryRun) args.push("--dry-run");
  return runCli<DeployResult>(args);
}

export function checkSkills(ref?: string): Promise<CheckResult[]> {
  return runCli<CheckResult[]>(["skills", "check", ...(ref ? [ref] : ["--all"])], { timeout: NETWORK_TIMEOUT });
}

export function updateSkill(ref: string): Promise<UpdateResult[]> {
  return runCli<UpdateResult[]>(["skills", "update", ref], { timeout: NETWORK_TIMEOUT });
}

/** Irreversible: drops the library copy, every deployed copy and the DB row. */
export function removeSkill(ref: string): Promise<unknown> {
  return runCli(["skills", "remove", ref, "--yes"]);
}

/**
 * Pulls an unmanaged directory into the library. Used to resolve deploy conflicts.
 *
 * Adopting nothing is not an error to the CLI: a path with no `SKILL.md`, one
 * already managed, or one that is not a directory all exit zero with an empty
 * `adopted` list and the reason in `skipped`. Callers must check, not just await.
 */
export function adoptPath(target: string, dryRun = false): Promise<AdoptResult> {
  return runCli<AdoptResult>(["skills", "adopt", target, ...(dryRun ? ["--dry-run"] : [])], {
    timeout: NETWORK_TIMEOUT,
  });
}

export interface AdoptResult {
  ok?: boolean;
  adopted?: { name?: string; path?: string }[];
  skipped?: { path?: string; reason?: string }[];
}

export function listTags(): Promise<string[]> {
  return runCli<string[]>(["skills", "tag", "list"]);
}

export function addTags(ref: string, tags: string[]): Promise<unknown> {
  return runCli(["skills", "tag", "add", ref, ...tags]);
}

export function removeTag(ref: string, tag: string): Promise<unknown> {
  return runCli(["skills", "tag", "remove", ref, tag]);
}

export function listAgents(): Promise<Agent[]> {
  return runCli<Agent[]>(["agents", "list"]);
}

/** Also re-syncs the legacy active preset, if the user still has one. */
export function enableAgent(key: string): Promise<unknown> {
  return runCli(["agents", "enable", key]);
}

/** Removes every managed deployment for the agent. */
export function disableAgent(key: string): Promise<unknown> {
  return runCli(["agents", "disable", key]);
}

export function listPresets(): Promise<Preset[]> {
  return runCli<Preset[]>(["presets", "list"]);
}

export function presetStatus(ref: string): Promise<PresetStatus> {
  return runCli<PresetStatus>(["presets", "status", ref]);
}

/** Additive. With no agents the CLI targets every installed, enabled coding agent. */
export function deployPreset(ref: string, agents: string[] = [], dryRun = false): Promise<DeployResult> {
  const args = ["presets", "deploy", ref];
  for (const agent of agents) args.push("--agent", agent);
  if (dryRun) args.push("--dry-run");
  return runCli<DeployResult>(args);
}

/**
 * With no agents the CLI discovers the preset's actual target rows and removes
 * them even where the agent is now disabled or unregistered — this is the
 * "turn it off everywhere" form, and is intentionally broader than deploy's default.
 */
export function undeployPreset(ref: string, agents: string[] = [], dryRun = false): Promise<DeployResult> {
  const args = ["presets", "undeploy", ref];
  for (const agent of agents) args.push("--agent", agent);
  if (dryRun) args.push("--dry-run");
  return runCli<DeployResult>(args);
}

export function createPreset(name: string, description?: string): Promise<unknown> {
  const args = ["presets", "create", name];
  if (description) args.push("--description", description);
  return runCli(args);
}

export function updatePreset(ref: string, changes: { name?: string; description?: string }): Promise<unknown> {
  const args = ["presets", "update", ref];
  if (changes.name) args.push("--name", changes.name);
  if (changes.description !== undefined) args.push("--description", changes.description);
  return runCli(args);
}

export function deletePreset(ref: string): Promise<unknown> {
  return runCli(["presets", "delete", ref, "--yes"]);
}

/** Membership only. Does not deploy or undeploy anything. */
export function addSkillsToPreset(preset: string, skills: string[]): Promise<unknown> {
  return runCli(["presets", "add-skill", preset, ...skills]);
}

/** Membership only. Deployed copies stay where they are. */
export function removeSkillsFromPreset(preset: string, skills: string[]): Promise<unknown> {
  return runCli(["presets", "remove-skill", preset, ...skills]);
}

export function repoStatus(): Promise<RepoStatus> {
  return runCli<RepoStatus>(["repo", "status"]);
}
