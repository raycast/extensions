import { IconEntry, IconNode } from "./types";

export function splitTags(tags: string[] | string): string[] {
  const list = Array.isArray(tags) ? tags : tags.split(",");
  return [...new Set(list.map((tag) => tag.trim().toLowerCase()).filter(Boolean))];
}

/**
 * Reads `dist/esm/index.js` of `@hugeicons/core-free-icons`: drawing file → every icon name exported for it,
 * without the `Icon` suffix. One drawing often carries several names (`ClockHour1Icon`, `ClockHourOneIcon`).
 */
export function parseIndexExports(indexJs: string): Record<string, string[]> {
  const exports: Record<string, string[]> = {};
  for (const match of indexJs.matchAll(/export \{([^}]*)\} from '\.\/(\w+)\.js'/g)) {
    const file = match[2];
    const names = match[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/)[1])
      .filter((name): name is string => Boolean(name) && name.endsWith("Icon"));
    exports[file] = [...new Set([file, ...names])].map((name) => name.replace(/Icon$/, ""));
  }
  return exports;
}

/** Reads one drawing module (`dist/esm/Add01Icon.js`) as data, without running it. */
export function parseIconModule(js: string): IconNode[] {
  const nodes: IconNode[] = [];
  for (const element of js.matchAll(/\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]/g)) {
    const attrs: Record<string, string> = {};
    for (const attr of element[2].matchAll(/(\w+):\s*"([^"]*)"/g)) attrs[attr[1]] = attr[2];
    nodes.push([element[1], attrs]);
  }
  if (!nodes.length) throw new Error("No drawing found in icon module");
  return nodes;
}

/**
 * One drawing in the file the extension ships (`assets/hugeicons-icons.json`, built by
 * Icon-Search/tools/tag-gen/ship.py): its Hugeicons name, a category, and search tags we wrote ourselves.
 */
export interface ShippedHugeicon {
  name: string;
  category: string;
  tags: string[];
}

export interface ShippedHugeicons {
  /** The package version the tags were written for. */
  version: string;
  /** Drawing file (`Add01Icon`) → its entry. */
  icons: Record<string, ShippedHugeicon>;
  /** Drawing files added in the 90 days before the release the list was built for. */
  new: string[];
}

export function parseShippedHugeicons(json: unknown): ShippedHugeicons {
  const data = json as { version?: unknown; icons?: unknown };
  if (!data || typeof data.icons !== "object" || data.icons === null || Array.isArray(data.icons)) {
    throw new Error("The shipped Hugeicons list is unreadable");
  }
  const icons: Record<string, ShippedHugeicon> = {};
  for (const [file, value] of Object.entries(data.icons as Record<string, unknown>)) {
    const entry = value as Partial<ShippedHugeicon> | null;
    if (!entry || typeof entry.name !== "string" || !entry.name) continue;
    icons[file] = {
      name: entry.name,
      category: typeof entry.category === "string" && entry.category ? entry.category : "other",
      tags: Array.isArray(entry.tags) ? splitTags(entry.tags.filter((tag) => typeof tag === "string")) : [],
    };
  }
  const added = (json as { new?: unknown }).new;
  return {
    version: typeof data.version === "string" ? data.version : "",
    icons,
    new: Array.isArray(added) ? added.filter((file): file is string => typeof file === "string") : [],
  };
}

/** A name for a drawing newer than the shipped list: `ArchiveOff01Icon` → `archive-off-01`. Mirrors ship.py. */
export function nameFromExport(file: string): string {
  return (file.replace(/Icon$/, "").match(/[A-Z][a-z]*|[a-z]+|[0-9]+/g) ?? [])
    .map((word) => word.toLowerCase())
    .join("-");
}

/**
 * Catalog entries for every free drawing in the package, A–Z by name. A drawing the shipped list doesn't
 * know yet (Hugeicons added it after our release) still shows, named from its export and tagged with its
 * other export names, until the next release brings its tags.
 */
export function buildHugeiconsEntries(
  shipped: ShippedHugeicons,
  exports: Record<string, string[]>,
  svgDir: string,
): IconEntry[] {
  const entries: IconEntry[] = [];
  const taken = new Set<string>();
  const files = Object.keys(exports).sort((a, b) => Number(!shipped.icons[a]) - Number(!shipped.icons[b]));
  for (const file of files) {
    const known = shipped.icons[file];
    const name = known?.name ?? nameFromExport(file);
    if (!name || taken.has(name)) continue;
    taken.add(name);
    const otherNames = exports[file].filter((alias) => `${alias}Icon` !== file).map(nameFromExport);
    entries.push({
      name,
      exportName: file,
      tags: known?.tags ?? splitTags(otherNames.map((alias) => alias.replace(/-/g, " "))),
      categories: [known?.category ?? "other"],
      file: `${svgDir}/${file}.svg`,
    });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Hugeicons' New set: drawings the shipped list marks as added in the 90 days before its release, and
 * drawings newer than the list itself.
 */
export function hugeiconsNewNames(entries: IconEntry[], shipped: ShippedHugeicons): string[] {
  const added = new Set(shipped.new);
  return entries
    .filter((entry) => added.has(entry.exportName) || !shipped.icons[entry.exportName])
    .map((entry) => entry.name);
}
