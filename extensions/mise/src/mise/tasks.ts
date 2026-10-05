import { isRecord, isStringArray, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type Task = { name: string; description: string; aliases: string[]; source: string; dir: string };

export function parseTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) throw new MiseOutputError("mise tasks ls: expected an array", JSON.stringify(raw));
  return raw.map((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.name !== "string" ||
      typeof entry.description !== "string" ||
      !isStringArray(entry.aliases) ||
      typeof entry.source !== "string" ||
      typeof entry.dir !== "string"
    ) {
      throw new MiseOutputError("mise tasks ls: task is malformed", JSON.stringify(entry));
    }
    return {
      name: entry.name,
      description: entry.description,
      aliases: entry.aliases,
      source: entry.source,
      dir: entry.dir,
    };
  });
}

export function listTasks(location: MiseLocation): Promise<Task[]> {
  return miseJson(location, ["tasks", "ls"], parseTasks);
}

// Tasks are namespaced with a colon (dotfiles:apply); the prefix is the section they belong to.
export function taskGroup(name: string): string | undefined {
  const index = name.indexOf(":");
  return index > 0 ? name.slice(0, index) : undefined;
}
