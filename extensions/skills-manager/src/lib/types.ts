/**
 * Types for the `skills-manager-cli --json` payloads.
 *
 * Written against output captured from CLI v1.37.0. The CLI ships with the
 * desktop app and gains fields over time, so every type here is a lower bound:
 * parse leniently, render what we recognise, never assume a field we did not
 * see is absent for good.
 */

export type SourceType = "git" | "skillssh" | "local" | "import";

/** A row of `skills list` / `skills show` / `skills status`. */
export interface Skill {
  id: string;
  name: string;
  description: string;
  path: string;
  /**
   * Legacy field. NOT deployment state — a skill can be `enabled: true` and
   * deployed nowhere. Use `deployed_to` instead and never surface this.
   */
  enabled: boolean;
  tags: string[];
  source_type: SourceType;
  source_ref: string | null;
  preset_ids: string[];
  presets: string[];
  /** Agent keys this skill has real managed deployments in. */
  deployed_to: string[];
}

/** `skills show` adds the on-disk contents on top of a `Skill`. */
export interface SkillDetail extends Skill {
  skill_file: string;
  files: string[];
  /** Full text of SKILL.md, front matter included. */
  markdown: string;
}

/** `skills status` adds a per-agent breakdown on top of a `Skill`. */
export interface SkillStatus extends Skill {
  agents: SkillStatusAgent[];
}

export interface SkillStatusAgent {
  key: string;
  display_name: string;
  installed: boolean;
  globally_enabled: boolean;
  deployed: boolean;
  target_path: string;
}

/** A row of `agents list`. */
export interface Agent {
  key: string;
  display_name: string;
  /** Whether the agent itself was detected on this machine. */
  installed: boolean;
  /** Whether Skills Manager is allowed to write to it. Independent of `installed`. */
  enabled: boolean;
  skills_dir: string;
  is_custom: boolean;
  has_path_override: boolean;
  project_relative_skills_dir: string;
  has_project_path_override: boolean;
  category: string;
}

/** A row of `presets list` / the payload of `presets show`. */
export interface Preset {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  skill_count: number;
  /** Legacy exclusive active-preset flag. Not additive deployment state. */
  active: boolean;
}

/** `presets status`. */
export interface PresetStatus {
  preset: Preset;
  agents: PresetStatusAgent[];
}

export interface PresetStatusAgent {
  key: string;
  display_name: string;
  /** How many of the preset's skills are deployed to this agent. */
  deployed: number;
  total: number;
  status: "active" | "partial" | "inactive" | string;
}

/** A row of `skills search` (skills.sh marketplace). */
export interface SearchResult {
  /** Paste straight into `skills install`. */
  install_ref: string;
  name: string;
  source: string;
  skill_id: string;
  /** Download count, used as a popularity/trust proxy. */
  installs: number;
  skills_sh_url: string;
}

export type UpdateStatus = "update_available" | "up_to_date" | "local_only" | "error" | string;

/** A row of `skills check`. */
export interface CheckResult {
  skill_id: string;
  name: string;
  source_type: SourceType;
  update_status: UpdateStatus;
  last_check_error: string | null;
  /** True for skills with no upstream to probe (local-only). */
  skipped: boolean;
}

/** A row of `skills update`. */
export interface UpdateResult {
  name: string;
  refreshed: boolean;
  /**
   * Present only when the update was withheld to protect files the new version
   * would delete. Its presence is the signal — test for that, not for a
   * non-empty array. `refreshed: false` alongside it is not a failure and must
   * not be retried.
   */
  held_back_removals?: string[];
  /**
   * Set when this one skill failed while the batch carried on. The command
   * still exits zero, so an unreported `error` here is a silent failure.
   */
  error?: string;
}

/**
 * True when an update was withheld to protect files. Shared so the two commands
 * that can trigger an update word the outcome the same way: it is not a
 * failure, and it is not "already up to date" either — an update exists and was
 * deliberately not applied.
 */
export function heldBack(results: UpdateResult[] | undefined): boolean {
  return Boolean(results?.some((entry) => entry.held_back_removals !== undefined));
}

/**
 * Result of `skills deploy` / `skills undeploy` / `presets deploy` / `presets undeploy`.
 *
 * The skill and preset forms return overlapping but different payloads — the
 * skill form names the skills it touched, the preset form names the preset — so
 * everything outside the common core is optional. `changed_pairs` is the field
 * worth reporting: it counts deployments that actually moved, which is 0 for a
 * deploy that was already in place.
 */
export interface DeployResult {
  ok: boolean;
  action: string;
  agents: string[];
  dry_run: boolean;
  skill_count: number;
  pair_count: number;
  changed_pairs: number;
  /** `skills deploy` / `skills undeploy` only. */
  skills?: string[];
  /** `presets deploy` / `presets undeploy` only. */
  preset_id?: string;
  preset_name?: string;
}

/** `repo status`. */
export interface RepoStatus {
  base_dir: string;
  skills_dir: string;
  db_path: string;
  metadata_dir: string;
  skill_count: number;
  preset_count: number;
  active_preset_id: string | null;
}

/** A single blocked target inside a TARGET_CONFLICT error payload. */
export interface TargetConflict {
  path: string;
  reason: string;
}
