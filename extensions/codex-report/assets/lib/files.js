import fs from "node:fs";
import path from "node:path";
import { sessionLines } from "./session-lines.js";


async function directoryEntries(directory, ignoreUnreadable) {
  try { return await fs.promises.readdir(directory, { withFileTypes: true }); }
  catch (error) {
    if (error.code === "ENOENT" || ignoreUnreadable) return [];
    throw error;
  }
}

async function walkFiles(root, accept, descend, ignoreUnreadable = false) {
  if (!root) return [];
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const directory = stack.pop();
    for (const entry of await directoryEntries(directory, ignoreUnreadable)) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory() && descend(entry.name)) stack.push(file);
      if (entry.isFile() && accept(entry.name)) files.push(file);
    }
  }
  return files.sort();
}

export async function sessionFiles(root) {
  const files = await walkFiles(root, (name) => /\.jsonl(?:\.zst)?$/.test(name), (name) => name !== "tool-results");
  const paths = new Set(files);
  return files.filter((file) => !file.endsWith(".zst") || !paths.has(file.slice(0, -4)));
}

export function namedFiles(root, fileName) {
  return walkFiles(root, (name) => name === fileName,
    (name) => !name.startsWith("plugin-backup-") && !name.startsWith("plugin-install-"), true);
}

// Ignore incomplete trailing lines while a live agent is writing its transcript.
export async function* jsonlEvents(filePath) {
  try {
    for await (const line of sessionLines(filePath)) {
      let event;
      try { event = JSON.parse(line); } catch { continue; }
      if (event && typeof event === "object" && !Array.isArray(event)) yield event;
    }
  } catch (error) {
    if (error.code !== "ENOENT" && error.cause?.code !== "ENOENT") throw error;
  }
}
