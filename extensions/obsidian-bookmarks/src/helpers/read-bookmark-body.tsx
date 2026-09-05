import * as fs from "node:fs/promises";

import frontMatter from "front-matter";

import { File } from "../types";

export default async function readBookmarkBody(fullPath: string): Promise<string> {
  const content = await fs.readFile(fullPath, { encoding: "utf-8" });
  return frontMatter(content).body.trim();
}

/**
 * Returns the file with its body re-read from disk. The cached body can be
 * stale — or carry the duplicated frontmatter written by older versions — so
 * anything that writes a bookmark back without meaning to change its body
 * must go through this first.
 */
export async function withFreshBody(file: File): Promise<File> {
  return { ...file, body: await readBookmarkBody(file.fullPath) };
}
