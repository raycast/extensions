import { createHash } from "node:crypto";
import { basename } from "node:path";
import yaml from "js-yaml";
import type { ParsedSkill, RawSkillEntry } from "./types";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

export function skillId(realPath: string): string {
  return createHash("sha1").update(realPath).digest("hex").slice(0, 12);
}

export function splitFrontmatter(raw: string): {
  frontmatter: Record<string, unknown>;
  body: string;
  error?: string;
} {
  const m = raw.match(FRONTMATTER_RE);
  if (!m)
    return { frontmatter: {}, body: raw.trim(), error: "no frontmatter block" };
  try {
    const fm = yaml.load(m[1]);
    if (typeof fm !== "object" || fm === null) {
      return {
        frontmatter: {},
        body: m[2].trim(),
        error: "frontmatter is not a map",
      };
    }
    return { frontmatter: fm as Record<string, unknown>, body: m[2].trim() };
  } catch (e) {
    return {
      frontmatter: {},
      body: m[2]?.trim() ?? "",
      error: `yaml error: ${(e as Error).message}`,
    };
  }
}

export function extractTriggerHints(description: string): string[] {
  const hints = new Set<string>();
  for (const m of description.matchAll(/"([^"]{2,40})"/g))
    hints.add(m[1].trim());
  const tw = description.match(/[Tt]rigger words?:\s*([^.\n]+)/);
  if (tw)
    tw[1].split(",").forEach((s) => {
      const t = s.trim();
      if (t) hints.add(t);
    });
  const uw = description.match(/[Uu]se when ([^.]{3,120})\./);
  if (uw) hints.add(`use when ${uw[1].trim()}`);
  return [...hints];
}

export function tokenizeKeywords(description: string): string[] {
  const toks = description
    .toLowerCase()
    .replace(/[^a-z0-9一-鿿]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 2);
  return [...new Set(toks)].slice(0, 50);
}

export function parseEntry(
  entry: RawSkillEntry,
  rawMd: string | null,
): ParsedSkill {
  const dirName = basename(entry.realPath);
  let frontmatter: Record<string, unknown> = {};
  let body = "";
  let parseError: string | undefined;

  if (entry.isBroken) {
    parseError = "broken symlink: target missing";
  } else if (!entry.skillMdExists || rawMd === null) {
    parseError = "SKILL.md missing";
  } else {
    const r = splitFrontmatter(rawMd);
    frontmatter = r.frontmatter;
    body = r.body;
    if (r.error) parseError = r.error;
  }

  const name =
    typeof frontmatter.name === "string" && frontmatter.name.trim()
      ? frontmatter.name.trim()
      : dirName;
  const description =
    typeof frontmatter.description === "string" ? frontmatter.description : "";

  return {
    id: skillId(entry.realPath),
    name,
    description,
    surface: entry.surface,
    source: entry.source,
    marketplace: entry.marketplace,
    pluginName: entry.pluginName,
    pluginVersion: entry.pluginVersion,
    entryPath: entry.entryPath,
    realPath: entry.realPath,
    isSymlink: entry.isSymlink,
    isBroken: entry.isBroken,
    skillMdExists: entry.skillMdExists,
    parseError,
    frontmatter,
    body: body.slice(0, 2048),
    fileMtime: entry.fileMtime ?? 0,
    triggerHints: extractTriggerHints(description),
    keywords: tokenizeKeywords(description),
  };
}
