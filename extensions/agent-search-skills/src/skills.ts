import { readFile, readdir, realpath } from "fs/promises";
import { homedir } from "os";
import { basename, dirname, isAbsolute, join, resolve } from "path";
import matter from "gray-matter";

export type SkillSource = "personal" | "pack" | "plugin" | "extra";

export interface Skill {
  /** Stable identity: the resolved real path of SKILL.md */
  id: string;
  /**
   * Invocation name as typed in Claude Code. Personal/pack/project skills are
   * invoked by their directory name; plugin skills by "plugin:dir".
   */
  name: string;
  description: string;
  /** false when frontmatter sets user-invocable: false (model-only skill) */
  userInvocable: boolean;
  source: SkillSource;
  /** Human label for the source column: "Personal", "Pack", or the plugin name */
  sourceLabel: string;
  /** Real path to SKILL.md */
  path: string;
}

export interface ScanResult {
  skills: Skill[];
  /** Human-readable problems hit during the scan (unreadable files, bad JSON) */
  warnings: string[];
}

const HOME = homedir();
const PERSONAL_DIR = join(HOME, ".claude", "skills");
const AGENTS_DIR = join(HOME, ".agents", "skills");
const INSTALLED_PLUGINS = join(HOME, ".claude", "plugins", "installed_plugins.json");

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function shortPath(path: string): string {
  return path.startsWith(HOME) ? "~" + path.slice(HOME.length) : path;
}

interface SkillFile {
  real: string;
  name: string;
  description: string;
  userInvocable: boolean;
}

async function readSkillFile(skillMdPath: string, warnings: string[]): Promise<SkillFile | null> {
  let real: string;
  try {
    real = await realpath(skillMdPath);
  } catch {
    // No SKILL.md here (stray file/dir in a skills folder) — normal, not a warning.
    return null;
  }
  let raw: string;
  try {
    raw = await readFile(real, "utf8");
  } catch (error) {
    warnings.push(`${shortPath(real)}: ${error instanceof Error ? error.message.split("\n")[0] : "unreadable"}`);
    return null;
  }
  try {
    const parsed = matter(raw);
    const data: Record<string, unknown> = parsed.data ?? {};
    return {
      real,
      name: asString(data.name),
      description: asString(data.description),
      userInvocable: data["user-invocable"] !== false,
    };
  } catch {
    // Claude Code parses frontmatter more leniently than strict YAML, so a
    // file that fails here can still be a working skill — recover what we can.
    return { real, ...lenientFrontmatter(raw) };
  }
}

const FRONTMATTER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function lenientFrontmatter(raw: string): { name: string; description: string; userInvocable: boolean } {
  const match = raw.match(FRONTMATTER_BLOCK);
  const lines = (match ? match[1] : "").split(/\r?\n/);

  const scalarValue = (key: string): string => {
    const start = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (start === -1) return "";
    const parts: string[] = [];
    const inline = lines[start].slice(key.length + 1).trim();
    if (!/^[>|][+-]?$/.test(inline)) parts.push(inline);
    for (let i = start + 1; i < lines.length; i++) {
      // Continuation lines are indented; the next top-level key ends the value.
      if (/^[ \t]/.test(lines[i]) || lines[i].trim() === "") parts.push(lines[i].trim());
      else break;
    }
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };

  return {
    name: scalarValue("name"),
    description: scalarValue("description"),
    userInvocable: !/^user-invocable:[ \t]*['"]?false['"]?[ \t]*(#.*)?$/im.test(match ? match[1] : ""),
  };
}

interface DirScanMeta {
  source: SkillSource;
  sourceLabel: string | ((real: string) => string);
  makeName?: (dirName: string) => string;
}

async function scanSkillDir(dir: string, seen: Set<string>, meta: DirScanMeta, warnings: string[]): Promise<Skill[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  const results = await Promise.all(
    entries
      .filter((entry) => !entry.startsWith("."))
      .map(async (entry): Promise<Skill | null> => {
        const file = await readSkillFile(join(dir, entry, "SKILL.md"), warnings);
        if (!file || seen.has(file.real)) return null;
        seen.add(file.real);
        return {
          id: file.real,
          // Claude invokes standalone skills by directory name, so the copied
          // command must come from the folder, not frontmatter.
          name: meta.makeName ? meta.makeName(entry) : entry,
          description: file.description,
          userInvocable: file.userInvocable,
          source: meta.source,
          sourceLabel: typeof meta.sourceLabel === "function" ? meta.sourceLabel(file.real) : meta.sourceLabel,
          path: file.real,
        };
      }),
  );
  return results.filter((skill): skill is Skill => skill !== null);
}

function declaredSkillPaths(manifest: unknown, installPath: string): string[] {
  const declared = (manifest as { skills?: unknown } | null)?.skills;
  const raw = Array.isArray(declared) ? declared : typeof declared === "string" ? [declared] : [];
  return raw
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    .map((entry) => (isAbsolute(entry) ? entry : resolve(installPath, entry)));
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

function pluginSkillFromFile(file: SkillFile, pluginName: string, fallbackDirName: string): Skill {
  return {
    id: file.real,
    name: `${pluginName}:${file.name || fallbackDirName}`,
    description: file.description,
    userInvocable: file.userInvocable,
    source: "plugin",
    sourceLabel: pluginName,
    path: file.real,
  };
}

async function scanPluginInstall(
  pluginName: string,
  installPath: string,
  seen: Set<string>,
  warnings: string[],
): Promise<Skill[]> {
  let manifest: unknown = null;
  for (const candidate of [join(installPath, ".claude-plugin", "plugin.json"), join(installPath, "plugin.json")]) {
    try {
      manifest = await readJson(candidate);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        warnings.push(
          `${shortPath(candidate)}: ${error instanceof Error ? error.message.split("\n")[0] : "unreadable"}`,
        );
      }
    }
  }

  const meta: DirScanMeta = {
    source: "plugin",
    sourceLabel: pluginName,
    makeName: (dirName) => `${pluginName}:${dirName}`,
  };
  const skills: Skill[] = [];
  skills.push(...(await scanSkillDir(join(installPath, "skills"), seen, meta, warnings)));

  // A declared path may be a parent of skill dirs, or point directly at a
  // single skill dir that itself contains SKILL.md.
  for (const dir of declaredSkillPaths(manifest, installPath)) {
    const direct = await readSkillFile(join(dir, "SKILL.md"), warnings);
    if (direct) {
      if (!seen.has(direct.real)) {
        seen.add(direct.real);
        skills.push(pluginSkillFromFile(direct, pluginName, basename(dir)));
      }
      continue;
    }
    skills.push(...(await scanSkillDir(dir, seen, meta, warnings)));
  }

  // A root SKILL.md only counts when the plugin exposed no other skills;
  // its name comes from frontmatter, falling back to the plugin name.
  if (skills.length === 0) {
    const rootSkill = await readSkillFile(join(installPath, "SKILL.md"), warnings);
    if (rootSkill && !seen.has(rootSkill.real)) {
      seen.add(rootSkill.real);
      skills.push({
        ...pluginSkillFromFile(rootSkill, pluginName, pluginName),
        name: rootSkill.name || pluginName,
      });
    }
  }
  return skills;
}

async function scanPluginSkills(seen: Set<string>, warnings: string[]): Promise<Skill[]> {
  let manifest: unknown;
  try {
    manifest = await readJson(INSTALLED_PLUGINS);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      warnings.push(
        `${shortPath(INSTALLED_PLUGINS)}: ${error instanceof Error ? error.message.split("\n")[0] : "unreadable"}`,
      );
    }
    return [];
  }

  const plugins = (manifest as { plugins?: unknown } | null)?.plugins;
  if (!plugins || typeof plugins !== "object") {
    warnings.push(`${shortPath(INSTALLED_PLUGINS)}: unexpected structure (no plugins map)`);
    return [];
  }

  const skills: Skill[] = [];
  for (const [key, installs] of Object.entries(plugins)) {
    const pluginName = key.split("@")[0];
    if (!pluginName || !Array.isArray(installs)) continue;
    for (const install of installs) {
      const installPath = (install as { installPath?: unknown } | null)?.installPath;
      if (typeof installPath !== "string" || installPath.length === 0) continue;
      skills.push(...(await scanPluginInstall(pluginName, installPath, seen, warnings)));
    }
  }
  return skills;
}

function parseExtraDirs(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim().replace(/^~(?=\/|$)/, HOME))
    .filter(Boolean);
}

function extraLabel(dir: string): string {
  // "/path/to/project/.claude/skills" should read as "project"
  if (basename(dir) === "skills" && basename(dirname(dir)) === ".claude") {
    return basename(dirname(dirname(dir)));
  }
  return basename(dir);
}

export async function loadSkills(extraDirsRaw?: string): Promise<ScanResult> {
  const seen = new Set<string>();
  const warnings: string[] = [];

  // The agents dir may itself be a symlink; resolve it so pack detection
  // compares real path against real path.
  let agentsReal = AGENTS_DIR;
  try {
    agentsReal = await realpath(AGENTS_DIR);
  } catch {
    // missing agents dir is fine
  }

  // Personal dir first: it holds real dirs (personal, gstack) plus symlinks
  // into ~/.agents/skills. Resolving symlinks marks the pack targets as seen,
  // so the agents-dir pass only adds packs that were never linked in.
  const personal = await scanSkillDir(
    PERSONAL_DIR,
    seen,
    {
      source: "personal",
      sourceLabel: (real) => (real.startsWith(agentsReal + "/") ? "Pack" : "Personal"),
    },
    warnings,
  );
  for (const skill of personal) {
    if (skill.sourceLabel === "Pack") skill.source = "pack";
  }

  const packs = await scanSkillDir(AGENTS_DIR, seen, { source: "pack", sourceLabel: "Pack" }, warnings);
  const plugin = await scanPluginSkills(seen, warnings);

  const extras: Skill[] = [];
  for (const dir of parseExtraDirs(extraDirsRaw)) {
    extras.push(...(await scanSkillDir(dir, seen, { source: "extra", sourceLabel: extraLabel(dir) }, warnings)));
  }

  const skills = [...personal, ...packs, ...plugin, ...extras];
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { skills, warnings };
}

/** Words from the description that make trigger-style search hit (e.g. "oklch", "ui"). */
export function searchKeywords(skill: Skill): string[] {
  const words = `${skill.name.replace(/[:/-]/g, " ")} ${skill.description}`
    .toLowerCase()
    .split(/[^a-z0-9.+]+/)
    .filter((word) => word.length >= 2);
  return [...new Set(words)].slice(0, 150);
}

/** Markdown for the detail pane, read on demand so the list itself stays light. */
export async function loadSkillMarkdown(skill: Skill): Promise<string> {
  let raw: string;
  try {
    raw = await readFile(skill.path, "utf8");
  } catch (error) {
    return `Could not read ${skill.path}: ${error instanceof Error ? error.message : "unknown error"}`;
  }
  let body: string;
  try {
    body = matter(raw).content.trim();
  } catch {
    // Same lenient stance as the scanner: strip the frontmatter block manually.
    body = raw.replace(FRONTMATTER_BLOCK, "").trim();
  }
  const header = skill.description ? `> ${skill.description.replace(/\s+/g, " ")}\n\n---\n\n` : "";
  return header + body;
}
