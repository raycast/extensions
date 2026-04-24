import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { logger } from "./logger";
import { workspaceSkillsDir } from "./workspace";

const MAX_FRONTMATTER_BYTES = 32 * 1024;

export const SkillFrontmatterSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    scope: z.string().optional(),
  })
  .passthrough();
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export type SkillScope = "global" | "workspace";

export interface SkillRecord {
  slug: string;
  displayName: string;
  description?: string;
  scope: SkillScope;
}

/**
 * Extract the YAML frontmatter block (between the first two `---` lines) as key/value pairs.
 * Intentionally minimal — no nested objects, no lists beyond simple JSON arrays in quoted values.
 */
function parseFrontmatter(text: string): Record<string, unknown> | null {
  if (!text.startsWith("---")) return null;
  const secondFence = text.indexOf("\n---", 3);
  if (secondFence === -1) return null;
  const block = text.slice(3, secondFence).replace(/^\n/, "");
  const out: Record<string, unknown> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function readSkill(skillDir: string, slug: string, scope: SkillScope): SkillRecord | null {
  const skillMdPath = path.join(skillDir, "SKILL.md");
  try {
    const stat = fs.statSync(skillMdPath);
    if (stat.size > MAX_FRONTMATTER_BYTES) {
      return { slug, displayName: slug, scope };
    }
    const content = fs.readFileSync(skillMdPath, "utf8");
    const fm = parseFrontmatter(content);
    if (!fm) return { slug, displayName: slug, scope };
    const parsed = SkillFrontmatterSchema.safeParse(fm);
    if (!parsed.success) return { slug, displayName: slug, scope };
    return {
      slug,
      displayName: parsed.data.name ?? slug,
      description: parsed.data.description,
      scope,
    };
  } catch (err) {
    logger.debug("skills.read_failed", { skillDir, err: String(err) });
    return null;
  }
}

function listSkillsIn(baseDir: string, scope: SkillScope): SkillRecord[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: SkillRecord[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const rec = readSkill(path.join(baseDir, e.name), e.name, scope);
    if (rec) out.push(rec);
  }
  return out;
}

function expandHome(p: string): string {
  if (!p.startsWith("~")) return p;
  return path.join(os.homedir(), p.slice(1).replace(/^[/\\]/, ""));
}

/**
 * Merge skills from global + workspace directories. Workspace shadows global on slug collision.
 */
export function listSkills(workspaceRoot: string, globalSkillsDirRaw: string): SkillRecord[] {
  const global = listSkillsIn(expandHome(globalSkillsDirRaw), "global");
  const ws = listSkillsIn(workspaceSkillsDir(workspaceRoot), "workspace");
  const bySlug = new Map<string, SkillRecord>();
  for (const s of global) bySlug.set(s.slug, s);
  for (const s of ws) bySlug.set(s.slug, s);
  return [...bySlug.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}
