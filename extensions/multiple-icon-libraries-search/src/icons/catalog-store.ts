import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createGunzip } from "node:zlib";
import {
  Fetcher,
  libraryDir,
  readJson,
  TILE_FORMAT,
  writeFolderAtomic,
  writeJsonAtomic,
  writeTile,
} from "./catalog-files";
import { extraLibrary } from "./extra-libraries";
import {
  buildHugeiconsEntries,
  hugeiconsNewNames,
  parseIconModule,
  parseIndexExports,
  parseShippedHugeicons,
} from "./hugeicons";
import { buildLucideEntries, lucideNewNames, parseIconNodes, pickBaselineVersion } from "./lucide";
import { tileToCopy } from "./svg";
import { TarExtractor } from "./tar";
import { Catalog, IconEntry, LibraryId } from "./types";

export { httpFetcher, libraryDir } from "./catalog-files";
export type { Fetcher } from "./catalog-files";

export const URLS = {
  hugeiconsLatest: "https://registry.npmjs.org/@hugeicons/core-free-icons/latest",
  lucideTags: "https://lucide.dev/api/tags",
  lucideCategories: "https://lucide.dev/api/categories",
  lucideNodes: "https://lucide.dev/api/icon-nodes",
  lucideRegistry: "https://registry.npmjs.org/lucide-static",
  lucideTagsAt: (version: string) => `https://cdn.jsdelivr.net/npm/lucide-static@${version}/tags.json`,
};

/** The Hugeicons names, tags, and categories the extension ships, in its assets folder. */
export const HUGEICONS_DATA_FILE = "hugeicons-icons.json";

export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
const CATALOG_FILE = "catalog.json";
const BASELINE_FILE = "baseline.json";
const EXPORTS_FILE = "exports.json";
const SAFE_VERSION = /^[\w.-]+$/;

/** Where a refresh reads what doesn't come from the network. */
export interface CatalogSources {
  /** Path to the shipped Hugeicons list (`HUGEICONS_DATA_FILE` in the assets folder). */
  hugeiconsData?: string;
  /** Passed on to libraries from extra-libraries.ts. */
  extra?: Record<string, unknown>;
}

/** The last downloaded catalog, or undefined when there is none or it is unreadable. */
export function readCatalog(root: string, library: LibraryId): Catalog | undefined {
  try {
    const catalog = JSON.parse(readFileSync(join(libraryDir(root, library), CATALOG_FILE), "utf8")) as Catalog;
    return catalog.library === library && Array.isArray(catalog.icons) && catalog.icons.length ? catalog : undefined;
  } catch {
    return undefined;
  }
}

/** Stale when a day old, dated in the future, or drawn in an older tile format (so a format bump redraws on next open). */
export function isStale(catalog: Catalog | undefined, now: number): boolean {
  if (!catalog || now - catalog.fetchedAt >= STALE_AFTER_MS || now < catalog.fetchedAt) return true;
  const file = catalog.icons[0]?.file;
  return file !== undefined && !file.startsWith(`svg-${TILE_FORMAT}-`);
}

/** The icon's tile, shared by both layouts. */
export function tilePath(root: string, library: LibraryId, icon: IconEntry): string {
  return join(libraryDir(root, library), icon.file);
}

/** The icon as a `currentColor` SVG at its own box (24 px unless the library draws on another), ready to copy or save. */
export function readCopySvg(root: string, library: LibraryId, icon: IconEntry): string {
  return tileToCopy(readFileSync(tilePath(root, library, icon), "utf8"), icon.viewBox);
}

function removeOtherDrawings(dir: string, keep: string): void {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("svg-") && entry !== keep) rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

const HUGEICONS_INDEX = "package/dist/esm/index.js";
const HUGEICONS_MODULE = /^package\/dist\/esm\/(\w+Icon)\.js$/;

/** Streams the free package's tarball, writing one black tile per drawing; returns the export map. */
async function downloadHugeiconsDrawings(
  tarball: AsyncIterable<Uint8Array>,
  folder: string,
): Promise<Record<string, string[]>> {
  let indexJs = "";
  const written = new Set<string>();
  const extractor = new TarExtractor(
    (path) => path === HUGEICONS_INDEX || HUGEICONS_MODULE.test(path),
    (path, data) => {
      if (path === HUGEICONS_INDEX) {
        indexJs = data.toString("utf8");
        return;
      }
      const file = HUGEICONS_MODULE.exec(path)![1];
      try {
        writeTile(join(folder, file), parseIconModule(data.toString("utf8")), "hugeicons");
        written.add(file);
      } catch {
        // A module without a readable drawing is left out, the same as an icon with no free drawing.
      }
    },
  );
  await pipeline(Readable.from(tarball), createGunzip(), async (source: AsyncIterable<Buffer>) => {
    for await (const chunk of source) extractor.write(chunk);
  });
  extractor.end();
  if (!indexJs) throw new Error("Hugeicons package has no index");
  const exports = Object.fromEntries(Object.entries(parseIndexExports(indexJs)).filter(([file]) => written.has(file)));
  if (!Object.keys(exports).length) throw new Error("Hugeicons package has no drawings");
  writeFileSync(join(folder, EXPORTS_FILE), JSON.stringify(exports));
  return exports;
}

/** npm's `sha512-<base64>` checksum for a tarball, or undefined when it's missing or another kind. */
export function parseIntegrity(value: unknown): string | undefined {
  return typeof value === "string"
    ? value.split(/\s+/).find((entry) => /^sha512-[A-Za-z0-9+/]+=*$/.test(entry))
    : undefined;
}

/** Passes the download through unchanged while hashing it; `check` throws when it doesn't match npm's checksum. */
function checksummed(source: AsyncIterable<Uint8Array>, integrity: string) {
  const hash = createHash("sha512");
  return {
    bytes: (async function* () {
      for await (const chunk of source) {
        hash.update(chunk);
        yield chunk;
      }
    })(),
    check() {
      if (`sha512-${hash.digest("base64")}` !== integrity)
        throw new Error("Hugeicons download didn't match npm's checksum");
    },
  };
}

async function refreshHugeicons(
  dir: string,
  fetcher: Fetcher,
  now: number,
  previous: Catalog | undefined,
  dataPath: string | undefined,
): Promise<Catalog> {
  if (!dataPath) throw new Error("The extension's Hugeicons list is missing");
  const shipped = parseShippedHugeicons(JSON.parse(readFileSync(dataPath, "utf8")));
  const latest = (await fetcher.json(URLS.hugeiconsLatest)) as {
    version?: unknown;
    dist?: { tarball?: unknown; integrity?: unknown };
  };
  const version = typeof latest.version === "string" && SAFE_VERSION.test(latest.version) ? latest.version : "";
  const tarballUrl = typeof latest.dist?.tarball === "string" ? latest.dist.tarball : "";
  const integrity = parseIntegrity(latest.dist?.integrity);
  if (!version || !tarballUrl.startsWith("https://registry.npmjs.org/") || !integrity) {
    throw new Error("npm gave no usable Hugeicons release");
  }
  const svgDir = `svg-${TILE_FORMAT}-${version}`;
  const exportsPath = join(dir, svgDir, EXPORTS_FILE);
  let exports: Record<string, string[]>;
  if (previous?.drawingsVersion === version && existsSync(exportsPath)) {
    exports = JSON.parse(readFileSync(exportsPath, "utf8"));
  } else {
    const download = checksummed(await fetcher.bytes(tarballUrl), integrity);
    let downloaded: Record<string, string[]> = {};
    await writeFolderAtomic(dir, svgDir, async (folder) => {
      downloaded = await downloadHugeiconsDrawings(download.bytes, folder);
      download.check();
    });
    exports = downloaded;
  }
  const icons = buildHugeiconsEntries(shipped, exports, svgDir);
  return {
    library: "hugeicons",
    icons,
    newNames: hugeiconsNewNames(icons, shipped),
    fetchedAt: now,
    drawingsVersion: version,
    dropped: [],
  };
}

interface Baseline {
  version: string;
  names: string[];
}

/**
 * The npm release about 90 days old that the New set is measured against, with the names in it.
 * `namesAt` reads them; it runs only when the baseline release moves.
 */
async function npmBaseline(
  dir: string,
  fetcher: Fetcher,
  now: number,
  registryUrl: string,
  namesAt: (version: string) => Promise<string[] | undefined>,
): Promise<Baseline | undefined> {
  const path = join(dir, BASELINE_FILE);
  const saved = readJson<Baseline>(path);
  try {
    const registry = (await fetcher.json(registryUrl)) as { time?: Record<string, string> };
    const version = pickBaselineVersion(registry.time ?? {}, now);
    if (!version || !SAFE_VERSION.test(version)) return saved;
    if (saved?.version === version) return saved;
    const names = await namesAt(version);
    if (!names?.length) return saved;
    const baseline = { version, names };
    writeJsonAtomic(path, baseline);
    return baseline;
  } catch {
    // The New set is a nicety; keep the last one rather than failing the whole refresh.
    return saved;
  }
}

async function refreshLucide(dir: string, fetcher: Fetcher, now: number, previous?: Catalog): Promise<Catalog> {
  const [tags, categories, nodesJson] = await Promise.all([
    fetcher.json(URLS.lucideTags),
    fetcher.json(URLS.lucideCategories),
    fetcher.json(URLS.lucideNodes),
  ]);
  const nodes = parseIconNodes(nodesJson);
  const names = Object.keys(nodes).filter((name) => /^[a-z0-9-]+$/.test(name));
  if (!names.length) throw new Error("Lucide sent no icons");
  const svgDir = `svg-${TILE_FORMAT}-${now}`;
  await writeFolderAtomic(dir, svgDir, (folder) => {
    for (const name of names) writeTile(join(folder, name), nodes[name], "lucide");
  });
  const icons = buildLucideEntries(tags, categories, names, svgDir);
  const baseline = await npmBaseline(dir, fetcher, now, URLS.lucideRegistry, async (old) => {
    const tags = await fetcher.json(URLS.lucideTagsAt(old));
    return tags && typeof tags === "object" ? Object.keys(tags) : undefined;
  });
  const newNames = baseline ? lucideNewNames(names, baseline.names) : (previous?.newNames ?? []);
  return {
    library: "lucide",
    icons,
    newNames,
    fetchedAt: now,
    drawingsVersion: new Date(now).toISOString(),
    dropped: [],
    baselineVersion: baseline?.version,
  };
}

/** Downloads a fresh catalog, saves it, and clears out older drawings. The previous one stays until this succeeds. */
export async function refreshCatalog(
  root: string,
  library: LibraryId,
  fetcher: Fetcher,
  now: number,
  sources: CatalogSources = {},
): Promise<Catalog> {
  const dir = libraryDir(root, library);
  mkdirSync(dir, { recursive: true });
  const previous = readCatalog(root, library);
  const catalog =
    library === "hugeicons"
      ? await refreshHugeicons(dir, fetcher, now, previous, sources.hugeiconsData)
      : library === "lucide"
        ? await refreshLucide(dir, fetcher, now, previous)
        : await extraLibrary(library).refresh(dir, fetcher, now, sources.extra ?? {});
  writeJsonAtomic(join(dir, CATALOG_FILE), catalog);
  removeOtherDrawings(dir, catalog.icons[0].file.split("/")[0]);
  return catalog;
}

/** An icon name made safe as a file name: no folders, no hidden files, nothing but plain characters. */
export function safeFileBase(name: string): string {
  const cleaned = name
    .replace(/[^\w .+-]+/g, "-")
    .replace(/^[.\s-]+/, "")
    .slice(0, 100)
    .trim();
  return cleaned || "icon";
}

/** A file name in `dir` that doesn't clobber an existing file: `ticket.svg`, then `ticket 2.svg`. */
export function freeFileName(name: string, taken: (name: string) => boolean): string {
  const base = safeFileBase(name);
  if (!taken(`${base}.svg`)) return `${base}.svg`;
  for (let n = 2; ; n++) if (!taken(`${base} ${n}.svg`)) return `${base} ${n}.svg`;
}
