import { SKILL_FILES } from "./skill-content.generated";

export interface SkillFrontmatter {
  name: string;
  description: string;
  tools_used: string[];
  read_only: boolean;
  upstream?: string;
  upstream_sha?: string;
  deprecated?: boolean;
  /**
   * Opt out of the extension-injected routing prelude that `run-skill`
   * normally appends to every skill body. Defaults to `false`. Set this
   * only when a skill's body is already authoritative enough that the
   * prelude would be redundant or contradictory.
   */
  skip_extension_prelude?: boolean;
}

/**
 * "Raw" frontmatter — only fields actually declared in YAML are populated.
 * Used by the runtime resolver to merge upstream content (which intentionally
 * omits Raycast-specific metadata like `tools_used`/`read_only`) with the
 * bundled SKILL.md (which always declares them).
 */
export type RawFrontmatter = Partial<SkillFrontmatter>;

export interface Skill {
  frontmatter: SkillFrontmatter;
  body: string;
  raw: string;
}

/**
 * Minimal YAML frontmatter parser. Returns only the keys that appeared in
 * the YAML — no defaults — so callers can detect "undeclared" vs "explicit
 * false" / "explicit empty array".
 */
function parseFrontmatterRaw(raw: string): { fields: RawFrontmatter; body: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("Skill missing YAML frontmatter delimiters (`---`).");
  const [, yaml, body] = match;
  const lines = yaml.split(/\r?\n/);
  const declared: Record<string, unknown> = {};
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
      declared[key] = currentList;
      continue;
    }
    // Inline JSON-style array: tools_used: [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      const items = inner
        ? inner
            .split(",")
            .map((s) => s.trim().replace(/^["']|["']$/g, ""))
            .filter(Boolean)
        : [];
      declared[key] = items;
      continue;
    }
    if (value === "true" || value === "false") {
      declared[key] = value === "true";
      continue;
    }
    declared[key] = value.replace(/^["']|["']$/g, "");
  }

  const fields: RawFrontmatter = {};
  if (typeof declared.name === "string") fields.name = declared.name;
  if (typeof declared.description === "string") fields.description = declared.description;
  if (Array.isArray(declared.tools_used)) fields.tools_used = declared.tools_used as string[];
  // Accept upstream alias `tools` as a synonym for tools_used.
  if (Array.isArray(declared.tools) && !fields.tools_used) {
    fields.tools_used = declared.tools as string[];
  }
  if (typeof declared.read_only === "boolean") fields.read_only = declared.read_only;
  if (typeof declared.upstream === "string") fields.upstream = declared.upstream;
  if (typeof declared.upstream_sha === "string") fields.upstream_sha = declared.upstream_sha;
  if (typeof declared.deprecated === "boolean") fields.deprecated = declared.deprecated;
  if (typeof declared.skip_extension_prelude === "boolean") {
    fields.skip_extension_prelude = declared.skip_extension_prelude;
  }

  return { fields, body };
}

function finalize(fields: RawFrontmatter): SkillFrontmatter {
  return {
    name: fields.name ?? "",
    description: fields.description ?? "",
    tools_used: fields.tools_used ?? [],
    read_only: fields.read_only ?? false,
    upstream: fields.upstream,
    upstream_sha: fields.upstream_sha,
    deprecated: fields.deprecated,
    skip_extension_prelude: fields.skip_extension_prelude,
  };
}

/**
 * Parse a raw `SKILL.md` string. Applies defaults: undeclared `tools_used`
 * becomes `[]`, undeclared `read_only` becomes `false`.
 */
export function parseSkill(raw: string): Skill {
  const { fields, body } = parseFrontmatterRaw(raw);
  const frontmatter = finalize(fields);
  if (!frontmatter.name) throw new Error("Skill frontmatter missing `name`.");
  if (!frontmatter.description) throw new Error("Skill frontmatter missing `description`.");
  return { frontmatter, body, raw };
}

/**
 * Parse upstream content while inheriting Raycast-specific metadata from a
 * bundled SKILL.md. Upstream wins for body + any field it actually declares;
 * bundled fills in `tools_used` / `read_only` / `upstream*` / `deprecated`
 * when upstream omits them.
 */
export function parseSkillWithBundledMetadata(rawUpstream: string, rawBundled: string): Skill {
  const upstream = parseFrontmatterRaw(rawUpstream);
  const bundled = parseFrontmatterRaw(rawBundled);
  const merged: RawFrontmatter = {
    name: upstream.fields.name ?? bundled.fields.name,
    description: upstream.fields.description ?? bundled.fields.description,
    tools_used:
      upstream.fields.tools_used && upstream.fields.tools_used.length > 0
        ? upstream.fields.tools_used
        : bundled.fields.tools_used,
    read_only: upstream.fields.read_only ?? bundled.fields.read_only,
    upstream: upstream.fields.upstream ?? bundled.fields.upstream,
    upstream_sha: upstream.fields.upstream_sha ?? bundled.fields.upstream_sha,
    deprecated: upstream.fields.deprecated ?? bundled.fields.deprecated,
    skip_extension_prelude: upstream.fields.skip_extension_prelude ?? bundled.fields.skip_extension_prelude,
  };
  const frontmatter = finalize(merged);
  if (!frontmatter.name) throw new Error("Skill frontmatter missing `name`.");
  if (!frontmatter.description) throw new Error("Skill frontmatter missing `description`.");
  return { frontmatter, body: upstream.body, raw: rawUpstream };
}

/** Bundled-only synchronous loader. */
export function loadSkill(name: string): Skill {
  const raw = SKILL_FILES[name];
  if (!raw) throw new Error(`Skill not found: ${name}. Did you run "npm run embed-skills"?`);
  return parseSkill(raw);
}

/** Returns the bundled raw `SKILL.md` content, or undefined if not bundled. */
export function loadBundledRaw(name: string): string | undefined {
  return SKILL_FILES[name];
}

/** Bundled-only synchronous catalog. */
export function listSkills(): Skill[] {
  return Object.keys(SKILL_FILES).map((name) => loadSkill(name));
}

/** Build the Quick AI prompt for a skill. */
export function buildPrompt(skill: Skill): string {
  return skill.body.trim();
}
