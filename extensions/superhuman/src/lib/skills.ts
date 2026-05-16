import { SKILL_FILES } from "./skill-content.generated";

export interface SkillFrontmatter {
  name: string;
  description: string;
  tools_used: string[];
  read_only: boolean;
  upstream?: string;
  upstream_sha?: string;
  deprecated?: boolean;
}

export interface Skill {
  frontmatter: SkillFrontmatter;
  body: string;
  raw: string;
}

/**
 * Minimal YAML frontmatter parser. Skill frontmatter is intentionally
 * simple (scalars, lists of scalars, bool, string) — we don't pull in a
 * full YAML lib for the extension bundle.
 */
function parseFrontmatter(raw: string): { frontmatter: SkillFrontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Skill missing YAML frontmatter delimiters (`---`).");
  const [, yaml, body] = match;
  const lines = yaml.split(/\r?\n/);
  const fm: Record<string, unknown> = {};
  let currentList: string[] | null = null;
  for (const line of lines) {
    if (line.match(/^\s*-\s+/) && currentList) {
      currentList.push(line.replace(/^\s*-\s+/, "").trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, valueRaw] = kv;
    const value = valueRaw.trim();
    currentList = null;
    if (value === "") {
      currentList = [];
      fm[key] = currentList;
      continue;
    }
    if (value === "true" || value === "false") {
      fm[key] = value === "true";
      continue;
    }
    fm[key] = value.replace(/^["']|["']$/g, "");
  }
  const frontmatter: SkillFrontmatter = {
    name: String(fm.name ?? ""),
    description: String(fm.description ?? ""),
    tools_used: Array.isArray(fm.tools_used) ? (fm.tools_used as string[]) : [],
    read_only: fm.read_only === true,
    upstream: fm.upstream ? String(fm.upstream) : undefined,
    upstream_sha: fm.upstream_sha ? String(fm.upstream_sha) : undefined,
    deprecated: fm.deprecated === true,
  };
  if (!frontmatter.name) throw new Error("Skill frontmatter missing `name`.");
  if (!frontmatter.description) throw new Error("Skill frontmatter missing `description`.");
  return { frontmatter, body };
}

/**
 * Parse a raw `SKILL.md` string. Exported for the runtime resolver in
 * `skill-source.ts` so cached/live content goes through the same parser as
 * the bundled fallback.
 */
export function parseSkill(raw: string): Skill {
  const { frontmatter, body } = parseFrontmatter(raw);
  return { frontmatter, body, raw };
}

/** Bundled-only synchronous loader. Used by tests, the embed script, and as
 * the fallback path inside the runtime resolver. */
export function loadSkill(name: string): Skill {
  const raw = SKILL_FILES[name];
  if (!raw) throw new Error(`Skill not found: ${name}. Did you run "npm run embed-skills"?`);
  return parseSkill(raw);
}

/** Bundled-only synchronous catalog. */
export function listSkills(): Skill[] {
  return Object.keys(SKILL_FILES).map((name) => loadSkill(name));
}

/** Build the Quick AI prompt for a skill. */
export function buildPrompt(skill: Skill): string {
  return skill.body.trim();
}
