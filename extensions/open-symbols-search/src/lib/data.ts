import { environment } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export type Library = { id: string; name: string; license: string };

export type OpenSymbol = {
  /** Stable key, e.g. "lucide/heart". */
  key: string;
  library: Library;
  /** File name in the library, e.g. "heart" or "heart.fill". */
  name: string;
  /** Name without the ".fill" suffix. */
  baseName: string;
  isFill: boolean;
  /** Asset name Xcode gives the symbol, e.g. "lucide.heart". */
  xcodeName: string;
  tags: string[];
  /** Position in the bundled index; keeps the default ordering stable. */
  order: number;
};

export type TreeShas = { dir: string | null; symbols: string | null };

export type RawIndex = {
  ref: string;
  trees?: Record<string, TreeShas>;
  libraries: Library[];
  symbols: ([number, string] | [number, string, string])[];
};

type Catalog = {
  ref: string;
  raw: RawIndex;
  /** Where the index came from: shipped with the extension, or downloaded by an update. */
  source: "bundled" | "downloaded";
  libraries: Library[];
  symbols: OpenSymbol[];
  byKey: Map<string, OpenSymbol>;
  countByLibrary: Map<string, number>;
};

let catalog: Catalog | undefined;

/** Index written by "Check for Symbol Updates". */
export function downloadedIndexPath() {
  return join(environment.supportPath, "data", "symbols.json");
}

function readIndex(path: string): RawIndex | undefined {
  try {
    return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as RawIndex) : undefined;
  } catch {
    return undefined;
  }
}

const reloadListeners = new Set<() => void>();

/** Subscribes to catalog reloads; returns an unsubscribe function. */
export function onCatalogReload(listener: () => void) {
  reloadListeners.add(listener);
  return () => {
    reloadListeners.delete(listener);
  };
}

/** Drops cached data so the next getCatalog() re-reads the index (after an update). */
export function reloadCatalog() {
  catalog = undefined;
  prepared = undefined;
  reloadListeners.forEach((l) => l());
}

export function getCatalog(): Catalog {
  if (catalog) return catalog;
  const bundled = readIndex(join(environment.assetsPath, "symbols.json"));
  const downloaded = readIndex(downloadedIndexPath());
  // Release tags are dates (YYYY.MM.DD), so string order is release order.
  // A newer extension build wins over an older downloaded update.
  const useDownloaded = Boolean(downloaded && (!bundled || downloaded.ref > bundled.ref));
  const raw = (useDownloaded ? downloaded : bundled) as RawIndex;
  const symbols = raw.symbols.map(([libIndex, name, tags], order): OpenSymbol => {
    const library = raw.libraries[libIndex];
    const isFill = name.endsWith(".fill");
    return {
      key: `${library.id}/${name}`,
      library,
      name,
      baseName: isFill ? name.slice(0, -5) : name,
      isFill,
      xcodeName: `${library.id}.${name}`,
      tags: tags ? tags.split(" ") : [],
      order,
    };
  });
  const countByLibrary = new Map<string, number>();
  for (const s of symbols) countByLibrary.set(s.library.id, (countByLibrary.get(s.library.id) ?? 0) + 1);
  catalog = {
    ref: raw.ref,
    raw,
    source: useDownloaded ? "downloaded" : "bundled",
    libraries: raw.libraries,
    symbols,
    byKey: new Map(symbols.map((s) => [s.key, s])),
    countByLibrary,
  };
  return catalog;
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

type Prepared = { symbol: OpenSymbol; nameWords: string[]; tagText: string };
let prepared: Prepared[] | undefined;

function getPrepared(): Prepared[] {
  if (!prepared) {
    prepared = getCatalog().symbols.map((symbol) => ({
      symbol,
      nameWords: symbol.name.split(/[-.]/),
      tagText: ` ${symbol.tags.join(" ")} `,
    }));
  }
  return prepared;
}

function tokenScore(p: Prepared, token: string): number {
  const name = p.symbol.name;
  const base = p.symbol.baseName;
  if (name === token || base === token) return 100;
  if (name.startsWith(token)) return 75;
  if (p.nameWords.includes(token)) return 65;
  if (p.nameWords.some((w) => w.startsWith(token))) return 50;
  if (name.includes(token)) return 40;
  if (p.tagText.includes(` ${token} `)) return 30;
  if (p.tagText.includes(` ${token}`)) return 18;
  return 0;
}

/**
 * Ranks symbols for a query. Matches every whitespace-separated token against
 * the name (strongest) and the upstream library's tags (weaker). A pasted
 * Xcode name such as "lucide.heart" narrows to that library.
 */
export function searchSymbols(query: string, libraryId: string | "all"): OpenSymbol[] {
  const { libraries } = getCatalog();
  let q = query.trim().toLowerCase();
  let lib = libraryId;

  const prefix = libraries.find((l) => q.startsWith(`${l.id}.`));
  if (prefix) {
    lib = prefix.id;
    q = q.slice(prefix.id.length + 1);
  }

  const pool = getPrepared().filter((p) => lib === "all" || p.symbol.library.id === lib);
  if (!q) return pool.map((p) => p.symbol);

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { p: Prepared; score: number }[] = [];
  for (const p of pool) {
    let score = 0;
    for (const t of tokens) {
      const s = tokenScore(p, t);
      if (s === 0) {
        score = 0;
        break;
      }
      score += s;
    }
    if (score > 0) scored.push({ p, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      Number(a.p.symbol.isFill) - Number(b.p.symbol.isFill) ||
      a.p.symbol.name.length - b.p.symbol.name.length ||
      a.p.symbol.order - b.p.symbol.order,
  );
  return scored.map((s) => s.p.symbol);
}

/** Every library's version of an icon with the same base name (outline and fill). */
export function sameIconElsewhere(symbol: OpenSymbol): OpenSymbol[] {
  return getCatalog().symbols.filter((s) => s.baseName === symbol.baseName);
}

/** The outline/fill pair a symbol belongs to, within its own library. */
export function variantsOf(symbol: OpenSymbol): OpenSymbol[] {
  return getCatalog().symbols.filter((s) => s.library.id === symbol.library.id && s.baseName === symbol.baseName);
}

export function websiteUrl(symbol: OpenSymbol): string {
  return `https://opensymbols.dev/${symbol.library.id}/${symbol.name}`;
}

export function githubUrl(symbol: OpenSymbol): string {
  return `https://github.com/OrchardKit/open-symbols/blob/${getCatalog().ref}/${symbol.library.id}/symbols/${symbol.name}.svg`;
}

export function licenseUrl(library: Library): string {
  return `https://github.com/OrchardKit/open-symbols/tree/${getCatalog().ref}/${library.id}`;
}
