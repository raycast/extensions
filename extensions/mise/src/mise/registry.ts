import { isRecord, isStringArray, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type RegistryTool = {
  short: string;
  description: string;
  backends: string[];
  bins: string[];
  aliases: string[];
};

export function parseRegistry(raw: unknown): RegistryTool[] {
  if (!Array.isArray(raw)) throw new MiseOutputError("mise registry: expected an array", JSON.stringify(raw));
  return raw.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.short !== "string" || !isStringArray(entry.backends)) {
      throw new MiseOutputError(`mise registry: entry ${index} is not a registry tool`, JSON.stringify(entry));
    }
    return {
      short: entry.short,
      description: typeof entry.description === "string" ? entry.description : "",
      backends: entry.backends,
      bins: isStringArray(entry.bins) ? entry.bins : [],
      aliases: isStringArray(entry.aliases) ? entry.aliases : [],
    };
  });
}

export function listRegistry(location: MiseLocation): Promise<RegistryTool[]> {
  return miseJson(location, ["registry"], parseRegistry);
}

export function backendKind(tool: RegistryTool): string {
  return tool.backends[0]?.split(":")[0] ?? "";
}
