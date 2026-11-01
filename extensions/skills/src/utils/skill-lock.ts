import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SkillLockEntry } from "../shared";

function skillLockPath(): string {
  const xdgStateHome = process.env.XDG_STATE_HOME;
  return xdgStateHome
    ? join(xdgStateHome, "skills", ".skill-lock.json")
    : join(homedir(), ".agents", ".skill-lock.json");
}

export async function readSkillLock(): Promise<Record<string, SkillLockEntry>> {
  try {
    return parseSkillLock(await readFile(skillLockPath(), "utf8"));
  } catch {
    // An unreadable lock file must never authorize update or removal.
  }
  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseSkillLock(contents: string): Record<string, SkillLockEntry> {
  const parsed: unknown = JSON.parse(contents);
  if (!isRecord(parsed) || !isRecord(parsed.skills)) return {};
  return Object.fromEntries(
    Object.entries(parsed.skills).filter(
      ([, value]) =>
        isRecord(value) &&
        typeof value.source === "string" &&
        typeof value.sourceType === "string" &&
        typeof value.skillPath === "string",
    ),
  ) as Record<string, SkillLockEntry>;
}
