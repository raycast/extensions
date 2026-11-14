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

export function filterRegistry(tools: RegistryTool[], query: string, limit: number): RegistryTool[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return tools;
  const ranked: { rank: number; tool: RegistryTool }[] = [];
  for (const tool of tools) {
    const rank = matchRank(tool, needle);
    if (rank !== undefined) ranked.push({ rank, tool });
  }
  ranked.sort((a, b) => a.rank - b.rank);
  return ranked.slice(0, limit).map((entry) => entry.tool);
}

function matchRank(tool: RegistryTool, needle: string): number | undefined {
  const short = tool.short.toLowerCase();
  if (short === needle) return 0;
  if (short.startsWith(needle)) return 1;
  const names = [...tool.aliases, ...tool.bins].map((name) => name.toLowerCase());
  if (names.some((name) => name.startsWith(needle))) return 2;
  if (short.includes(needle) || names.some((name) => name.includes(needle))) return 3;
  if (tool.description.toLowerCase().includes(needle)) return 3;
  return undefined;
}
