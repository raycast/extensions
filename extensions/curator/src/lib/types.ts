export type Surface = "claude" | "codex";

export type SourceType =
  | "claude-user"
  | "claude-plugin-marketplace"
  | "claude-plugin-nested"
  | "claude-plugin-cache"
  | "codex-user"
  | "codex-plugin-marketplace"
  | "codex-plugin-nested"
  | "codex-plugin-cache";

/** Raw scan result before SKILL.md is read/parsed. */
export type RawSkillEntry = {
  entryPath: string; // path as discovered (may be a symlink)
  realPath: string; // symlink-resolved; equals entryPath if not a symlink or if broken
  isSymlink: boolean;
  isBroken: boolean; // symlink whose target is missing
  skillMdExists: boolean;
  surface: Surface;
  source: SourceType;
  marketplace?: string;
  pluginName?: string;
  pluginVersion?: string;
  fileMtime: number | null; // mtimeMs of SKILL.md (or dir); null if unknown
};

/** A fully parsed skill — the single currency through the app. */
export type ParsedSkill = {
  id: string; // sha1(realPath).slice(0,12), stable across scans
  name: string; // frontmatter.name or basename(realPath)
  description: string;
  surface: Surface;
  source: SourceType;
  marketplace?: string;
  pluginName?: string;
  pluginVersion?: string;
  entryPath: string;
  realPath: string;
  isSymlink: boolean;
  isBroken: boolean;
  skillMdExists: boolean;
  parseError?: string; // set when SKILL.md missing / broken / YAML-invalid
  frontmatter: Record<string, unknown>; // full, preserved (v2 LLM hook)
  body: string; // SKILL.md body sans frontmatter, truncated to 2KB
  fileMtime: number; // 0 if unknown
  triggerHints: string[];
  keywords: string[];
};

/** One inventory row (may merge several ParsedSkills across surfaces). */
export type DisplaySkill = {
  key: string; // dedup key (realPath)
  name: string;
  description: string;
  surfaces: Surface[];
  source: SourceType;
  marketplace?: string;
  pluginName?: string;
  keywords: string[];
  primary: ParsedSkill; // representative instance for paths/body/triggers
};

export type HealthSeverity = "error" | "warning" | "info";

export type HealthIssue = {
  id: string; // stable per (check, skill)
  check: "H1" | "H2" | "H3" | "H4" | "H5";
  severity: HealthSeverity;
  skillName: string;
  message: string;
  affectedPaths: string[];
  meta: Record<string, string>; // extra data for fix-command generation
};

export type SkillIndex = {
  scannedAt: number;
  skills: ParsedSkill[];
};

export type CatalogEntry = {
  name: string;
  desc: string;
  triggers: string[];
  source: string;
};

export type RawRec = { name: string; confidence: string; why: string };

export type Recommendation = {
  skill: DisplaySkill;
  confidence: "high" | "medium" | "low";
  why: string;
};
