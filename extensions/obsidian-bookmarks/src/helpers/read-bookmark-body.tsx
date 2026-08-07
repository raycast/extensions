import * as fs from "node:fs/promises";

import frontMatter from "front-matter";

export default async function readBookmarkBody(fullPath: string): Promise<string> {
  const content = await fs.readFile(fullPath, { encoding: "utf-8" });
  return frontMatter(content).body.trim();
}
