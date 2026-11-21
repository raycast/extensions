import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { execFileAsync, runCLI, SFSymbolsApp } from "./sfsymbols-cli";
import { Catalog, CatalogIndex, category, Platform, PLATFORMS, sfsymbol } from "./types";

const PLUTIL_PATH = "/usr/bin/plutil";
const CATALOG_DIR = path.join(environment.supportPath, "catalog");

/**
 * Apple's usage restrictions (symbol name → notice), the text SF Symbols shows behind a symbol's
 * info badge. It ships with macOS itself, so it is there with or without the SF Symbols app.
 */
const RESTRICTIONS_FILE =
  "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/symbol_restrictions.strings";

/** Restriction notices by symbol name. Empty if the file is missing or unreadable. */
function loadRestrictions(): Promise<Record<string, string>> {
  return readPlistAsJSON<Record<string, string>>(RESTRICTIONS_FILE).catch((): Record<string, string> => ({}));
}

type BundledData = {
  categories: category[];
  symbols: (Omit<sfsymbol, "availability"> & { availableFrom?: number | string })[];
  versions: Record<string, Partial<Record<Platform, string>>>;
};

/** The snapshot that ships with the extension, used when SF Symbols 27.2+ is not installed. */
async function loadBundledCatalog(): Promise<Catalog> {
  const raw = await readFile(path.join(environment.assetsPath, "symbols", "data.json"), "utf8");
  const data: BundledData = JSON.parse(raw);
  const restrictions = await loadRestrictions();
  return {
    source: "bundled",
    key: "bundled",
    categories: data.categories,
    families: {},
    symbols: data.symbols.map(({ availableFrom, name, symbol, categories, searchTerms }) => ({
      name,
      symbol,
      categories,
      searchTerms,
      availability: availableFrom !== undefined ? data.versions[String(availableFrom)] : undefined,
      restriction: typeof restrictions[name] === "string" ? restrictions[name] : undefined,
    })),
  };
}

type CLISymbolRecord = {
  name: string;
  glyph?: string;
  codepoint?: string;
  availability?: Record<string, Record<string, string>>;
};

async function readPlistAsJSON<T>(file: string): Promise<T> {
  const { stdout } = await execFileAsync(PLUTIL_PATH, ["-convert", "json", "-o", "-", file], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

/**
 * Builds the catalog from the installed app.
 *
 * The symbol list, glyphs and availability come from the CLI, which is the public interface.
 * Categories, search tags and families come from the app's `Metadata/` files, which the CLI does
 * not expose. Those files are not a documented format, so each one degrades on its own: a missing
 * or reshaped file costs that feature (no categories, no tags, no family grouping), never the
 * catalog itself.
 */
async function buildAppCatalog(app: SFSymbolsApp, key: string): Promise<Catalog> {
  const metadata = path.join(app.appPath, "Contents", "Resources", "Metadata");
  const [records, categoryList, symbolCategories, searchTags, families, restrictions] = await Promise.all([
    runCLI(app, ["search", "--json", "--show-glyph", "--limit", "0", ""]).then(
      (stdout) => JSON.parse(stdout) as CLISymbolRecord[],
    ),
    readPlistAsJSON<{ key: string; icon: string; label: string }[]>(path.join(metadata, "categories.plist")).catch(
      () => [],
    ),
    readPlistAsJSON<Record<string, string[]>>(path.join(metadata, "symbol_categories.plist")).catch(
      (): Record<string, string[]> => ({}),
    ),
    readPlistAsJSON<Record<string, string[]>>(path.join(metadata, "symbol_search.plist")).catch(
      (): Record<string, string[]> => ({}),
    ),
    readFile(path.join(metadata, "base_symbols_map.json"), "utf8")
      .then((raw) => JSON.parse(raw) as Record<string, string[]>)
      .catch(() => ({}) as Record<string, string[]>),
    loadRestrictions(),
  ]);

  const symbols: sfsymbol[] = records.map((record) => {
    const monochrome = record.availability?.monochrome ?? {};
    const availability: Partial<Record<Platform, string>> = {};
    for (const platform of PLATFORMS) {
      if (monochrome[platform]) availability[platform] = monochrome[platform];
    }
    return {
      name: record.name,
      symbol: record.glyph ?? "",
      categories: Array.isArray(symbolCategories[record.name]) ? symbolCategories[record.name] : [],
      searchTerms: Array.isArray(searchTags[record.name]) ? searchTags[record.name] : [],
      availability,
      codepoint: record.codepoint,
      restriction: typeof restrictions[record.name] === "string" ? restrictions[record.name] : undefined,
      renderingModes: record.availability,
    };
  });

  const categories: category[] = categoryList
    .filter((entry) => entry && typeof entry.key === "string")
    .map((entry) => ({ name: entry.key, title: entry.label, symbol: entry.icon }));
  // The dropdown treats the first entry as "All". Guarantee one exists even if the plist moved.
  if (categories[0]?.name !== "all") {
    categories.unshift({ name: "all", title: "All", symbol: "square.grid.2x2" });
  }

  return { source: "app", key, symbols, categories, families };
}

async function appVersionKey(app: SFSymbolsApp): Promise<string> {
  const plist = path.join(app.appPath, "Contents", "Info.plist");
  const read = async (field: string) => {
    try {
      const { stdout } = await execFileAsync(PLUTIL_PATH, ["-extract", field, "raw", "-o", "-", plist]);
      return stdout.trim() || "unknown";
    } catch {
      return "unknown";
    }
  };
  const [shortVersion, build] = await Promise.all([read("CFBundleShortVersionString"), read("CFBundleVersion")]);
  // The builder's own text is part of the key, so a change to the cached shape evicts old
  // entries without anyone remembering to bump a version.
  const schema = createHash("sha256").update(buildAppCatalog.toString()).digest("hex").slice(0, 12);
  return `${shortVersion}-${build}-${schema}`.replace(/[^\w.-]/g, "_");
}

/**
 * The app catalog, read from the on-disk cache when the app has not changed since it was built.
 * Building it costs about a second of CLI and plist work; reading it back is a single file.
 */
async function loadAppCatalog(app: SFSymbolsApp): Promise<Catalog> {
  const key = await appVersionKey(app);
  const file = path.join(CATALOG_DIR, `${key}.json`);
  try {
    const cached = JSON.parse(await readFile(file, "utf8")) as Catalog;
    if (cached.key === key && Array.isArray(cached.symbols) && cached.symbols.length > 0) return cached;
  } catch {
    // No cache yet, or unreadable: rebuild below.
  }

  const catalog = await buildAppCatalog(app, key);
  if (catalog.symbols.length === 0) throw new Error("The SF Symbols app returned an empty catalog.");
  try {
    await mkdir(CATALOG_DIR, { recursive: true });
    // Only one catalog is ever current; older ones belong to app versions no longer installed.
    for (const entry of await readdir(CATALOG_DIR)) {
      if (entry !== `${key}.json`) await rm(path.join(CATALOG_DIR, entry), { force: true });
    }
    await writeFile(file, JSON.stringify(catalog));
  } catch {
    // A cache we can't write only costs a rebuild next launch.
  }
  return catalog;
}

export function indexCatalog(catalog: Catalog): CatalogIndex {
  const byName = new Map(catalog.symbols.map((symbol) => [symbol.name, symbol]));
  const familyOf = new Map<string, string>();
  for (const [base, variants] of Object.entries(catalog.families)) {
    if (!byName.has(base)) continue;
    familyOf.set(base, base);
    for (const variant of variants) {
      if (byName.has(variant)) familyOf.set(variant, base);
    }
  }
  // The app fills some categories from data it keeps to itself (Draw has no members in Apple's
  // category file or the CLI), so a category with nothing in it is left out of the menu.
  const used = new Set(catalog.symbols.flatMap((symbol) => symbol.categories));
  const categories = catalog.categories.filter((entry, index) => index === 0 || used.has(entry.name));
  return { ...catalog, categories, byName, familyOf };
}

export type LoadedCatalog = {
  catalog: CatalogIndex;
  /** Set when the app is installed but could not be read, so the bundled snapshot is showing instead. */
  appError?: unknown;
};

export async function loadCatalog(app: SFSymbolsApp | null): Promise<LoadedCatalog> {
  if (app) {
    try {
      return { catalog: indexCatalog(await loadAppCatalog(app)) };
    } catch (error) {
      return { catalog: indexCatalog(await loadBundledCatalog()), appError: error };
    }
  }
  return { catalog: indexCatalog(await loadBundledCatalog()) };
}

/** Every member of a symbol's family, base first, in Apple's order. Just the symbol when it has none. */
export function familyMembers(catalog: CatalogIndex, name: string): sfsymbol[] {
  const base = catalog.familyOf.get(name);
  if (!base) {
    const symbol = catalog.byName.get(name);
    return symbol ? [symbol] : [];
  }
  return [base, ...(catalog.families[base] ?? [])]
    .map((member) => catalog.byName.get(member))
    .filter((symbol): symbol is sfsymbol => symbol !== undefined);
}
