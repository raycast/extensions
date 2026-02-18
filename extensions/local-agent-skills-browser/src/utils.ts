import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { SkillFrontmatter } from "./types";

function parseFrontmatterManually(
  raw: string,
): { data: Record<string, string>; body: string } | null {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!match) return null;

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) data[key] = value;
  }
  return { data, body: match[2] ?? "" };
}

export function parseSkillMd(
  filePath: string,
): { frontmatter: SkillFrontmatter; body: string } | null {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  let data: Record<string, unknown> | undefined;
  let body = "";

  try {
    const result = matter(content);
    data = result.data;
    body = result.content;
  } catch {
    // gray-matter can throw on unquoted colons in YAML values
  }

  // Fall back to manual parsing if gray-matter threw or returned incomplete data
  if (!data?.name || !data?.description) {
    const fallback = parseFrontmatterManually(content);
    if (!fallback) return null;
    data = fallback.data;
    body = fallback.body;
  }

  if (!data.name || !data.description) {
    return null;
  }

  return {
    frontmatter: data as SkillFrontmatter,
    body: body.trim(),
  };
}

export function listSupplementaryFiles(dirPath: string): string[] {
  try {
    const entries = fs.readdirSync(dirPath);
    return entries.filter((entry) => {
      if (entry.startsWith(".")) return false;
      if (entry.toUpperCase() === "SKILL.MD") return false;
      try {
        return fs.statSync(path.join(dirPath, entry)).isFile();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
}
