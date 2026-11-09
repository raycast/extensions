import { splitTags } from "./hugeicons";
import { IconEntry, IconNode } from "./types";

export const NEW_WINDOW_DAYS = 90;

/** lucide-react's export name: `arrow-down-0-1` → `ArrowDown01`. */
export function lucideExportName(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function asRecord(json: unknown, what: string): Record<string, unknown> {
  if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error(`Lucide ${what} is not an object`);
  return json as Record<string, unknown>;
}

export function parseIconNodes(json: unknown): Record<string, IconNode[]> {
  const nodes: Record<string, IconNode[]> = {};
  for (const [name, value] of Object.entries(asRecord(json, "icon nodes"))) {
    if (!Array.isArray(value)) continue;
    const valid = value.filter(
      (node): node is IconNode => Array.isArray(node) && typeof node[0] === "string" && typeof node[1] === "object",
    );
    if (valid.length) nodes[name] = valid;
  }
  return nodes;
}

/** Catalog entries for every icon that has a drawing. `svgDir` is where the tiles live. */
export function buildLucideEntries(
  tagsJson: unknown,
  categoriesJson: unknown,
  names: string[],
  svgDir: string,
): IconEntry[] {
  const tags = asRecord(tagsJson, "tags");
  const categories = asRecord(categoriesJson, "categories");
  return [...names].sort().map((name) => ({
    name,
    exportName: lucideExportName(name),
    tags: splitTags(Array.isArray(tags[name]) ? (tags[name] as string[]) : []),
    categories: Array.isArray(categories[name]) ? (categories[name] as string[]) : [],
    file: `${svgDir}/${name}.svg`,
  }));
}

/**
 * The release to measure Lucide's New set against: the newest stable release published at least
 * `days` before `now`. `times` is the npm registry's `time` field (version → ISO date).
 */
export function pickBaselineVersion(
  times: Record<string, string>,
  now: number,
  days = NEW_WINDOW_DAYS,
): string | undefined {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  let best: { version: string; at: number } | undefined;
  for (const [version, iso] of Object.entries(times)) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) continue;
    const at = Date.parse(iso);
    if (Number.isNaN(at) || at > cutoff) continue;
    if (!best || at > best.at) best = { version, at };
  }
  return best?.version;
}

/** Names in today's list that the older release didn't have. */
export function lucideNewNames(current: string[], baseline: string[]): string[] {
  const old = new Set(baseline);
  return current.filter((name) => !old.has(name)).sort();
}
