import { homedir } from "node:os";
import { basename, join } from "node:path";
import { isRecord, isStringArray, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type ConfigFile = { path: string; tools: string[] };

export function parseConfigFiles(raw: unknown): ConfigFile[] {
  if (!Array.isArray(raw)) throw new MiseOutputError("mise config ls: expected an array", JSON.stringify(raw));
  return raw.map((entry) => {
    if (!isRecord(entry) || typeof entry.path !== "string" || !isStringArray(entry.tools)) {
      throw new MiseOutputError("mise config ls: entry is malformed", JSON.stringify(entry));
    }
    return { path: entry.path, tools: entry.tools };
  });
}

export function listConfigFiles(location: MiseLocation): Promise<ConfigFile[]> {
  return miseJson(location, ["config", "ls"], parseConfigFiles);
}

export function configFileLabel(path: string): string {
  const globalDir = join(homedir(), ".config", "mise") + "/";
  return path.startsWith(globalDir) ? path.slice(globalDir.length) : basename(path);
}
