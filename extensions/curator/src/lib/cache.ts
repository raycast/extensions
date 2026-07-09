import { Cache } from "@raycast/api";
import { homedir } from "node:os";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { scanSkills } from "./scanner";
import { parseEntry } from "./parser";
import { reconcileIndex } from "./reconcile";
import type { ParsedSkill, RawSkillEntry, SkillIndex } from "./types";

const cache = new Cache();
const KEY = "skills-index-v1";

export function readCachedIndex(): SkillIndex | null {
  const raw = cache.get(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SkillIndex;
  } catch {
    return null;
  }
}

export function writeIndex(index: SkillIndex): void {
  cache.set(KEY, JSON.stringify(index));
}

async function parseWithFile(entry: RawSkillEntry): Promise<ParsedSkill> {
  let rawMd: string | null = null;
  if (entry.skillMdExists && !entry.isBroken) {
    rawMd = await readFile(join(entry.realPath, "SKILL.md"), "utf8").catch(
      () => null,
    );
  }
  return parseEntry(entry, rawMd);
}

export async function getIndex(opts?: {
  force?: boolean;
  home?: string;
}): Promise<SkillIndex> {
  const home = opts?.home ?? homedir();
  const scanned = await scanSkills(home);
  const cached = opts?.force ? null : readCachedIndex();
  const index = await reconcileIndex({ scanned, cached, parse: parseWithFile });
  writeIndex(index);
  return index;
}
