import { environment } from "@raycast/api";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SFSymbol = {
  name: string;
  /** The actual glyph character (renders only where the SF font is available). */
  symbol: string;
  categories: string[];
  searchTerms: string[];
  /** Key into the versions table, e.g. "2019" or "2023.1". */
  availableFrom: string;
  restriction: string | null;
};

export type OSVersions = {
  iOS: string;
  macOS: string;
  tvOS: string;
  visionOS: string;
  watchOS: string;
};

export type Dataset = {
  symbols: SFSymbol[];
  categories: { name: string; title: string; symbol: string }[];
  versions: Record<string, OSVersions>;
};

const CORE_GLYPHS = "/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources";
const GLYPH_SOURCE_REPO = "MoOx/sf-symbols-svg";
const GLYPH_CACHE_FILE = join(environment.supportPath, "glyphs-fetched.json");
const GLYPH_FETCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RENDER_BATCH_SIZE = 400;

// A plausible glyph char is a single code point in or above the symbol ranges.
const isGlyphChar = (char: unknown): char is string =>
  typeof char === "string" && [...char].length === 1 && (char.codePointAt(0) ?? 0) >= 0x2000;

function readPlist<T>(file: string): T {
  const json = execFileSync("plutil", ["-convert", "json", "-o", "-", join(CORE_GLYPHS, file)], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });
  return JSON.parse(json) as T;
}

type FetchedGlyphs = { fetchedAt: number; chars: Record<string, string> };

function readFetchedGlyphs(): FetchedGlyphs | undefined {
  try {
    const cache = JSON.parse(readFileSync(GLYPH_CACHE_FILE, "utf8")) as FetchedGlyphs;
    return typeof cache.fetchedAt === "number" && cache.chars ? cache : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Builds the catalog from the system's own SF Symbols database (CoreGlyphs.bundle),
 * so names, search terms, and availability always match the user's macOS. Glyph
 * characters are layered: bundled baseline, then the fetched release metadata,
 * then alias healing for renamed symbols. Falls back to the bundled dataset if
 * the system read fails.
 */
export function loadDataset(): Dataset {
  const bundled: Dataset = JSON.parse(readFileSync(`${environment.assetsPath}/symbols/data.json`, "utf8"));
  try {
    const availability = readPlist<{
      symbols: Record<string, number | string>;
      year_to_release: Record<string, OSVersions>;
    }>("name_availability.plist");
    const search = readPlist<Record<string, string[]>>("symbol_search.plist");
    const categories = readPlist<Record<string, string[]>>("symbol_categories.plist");
    const aliases = readPlist<Record<string, string>>("name_aliases.strings");

    const glyphs = new Map<string, string>();
    for (const s of bundled.symbols) if (s.symbol) glyphs.set(s.name, s.symbol);
    for (const [name, char] of Object.entries(readFetchedGlyphs()?.chars ?? {})) {
      if (isGlyphChar(char)) glyphs.set(name, char);
    }
    // Renamed symbols keep their glyph character; resolve through the alias table
    // in both directions so old and new names share whichever glyph is known.
    for (const [legacy, current] of Object.entries(aliases)) {
      const glyph = glyphs.get(current) ?? glyphs.get(legacy);
      if (!glyph) continue;
      if (!glyphs.has(current)) glyphs.set(current, glyph);
      if (!glyphs.has(legacy)) glyphs.set(legacy, glyph);
    }

    const symbols = Object.keys(availability.symbols)
      .sort()
      .map((name) => ({
        name,
        symbol: glyphs.get(name) ?? "",
        categories: categories[name] ?? [],
        searchTerms: search[name] ?? [],
        availableFrom: String(availability.symbols[name]),
        restriction: null,
      }));

    return { symbols, categories: bundled.categories, versions: availability.year_to_release };
  } catch {
    return bundled;
  }
}

/**
 * Refreshes the name→glyph-char cache from Apple's official per-release lists
 * (as republished by MoOx/sf-symbols-svg, MIT) at most once a week. Fire and
 * forget: results apply on the next launch; failures (e.g. offline) are silent.
 */
export function refreshGlyphsInBackground(): void {
  const cache = readFetchedGlyphs();
  if (cache && Date.now() - cache.fetchedAt < GLYPH_FETCH_TTL_MS) return;

  void (async () => {
    try {
      const get = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return res.text();
      };
      const listing = JSON.parse(await get(`https://api.github.com/repos/${GLYPH_SOURCE_REPO}/contents/sources`)) as {
        name: string;
        type: string;
      }[];
      // The two newest releases: a beta can rename symbols that the installed
      // macOS still uses the older name for, so merge both (newest wins).
      const versions = listing
        .filter((entry) => entry.type === "dir")
        .map((entry) => entry.name)
        .sort((a, b) => parseFloat(a) - parseFloat(b))
        .slice(-2);

      const chars: Record<string, string> = {};
      for (const version of versions) {
        const base = `https://raw.githubusercontent.com/${GLYPH_SOURCE_REPO}/main/sources/${version}`;
        const lines = (text: string) => text.split("\n").filter((l) => l.trim() && !l.startsWith("//"));
        const names = lines(await get(`${base}/names.txt`)).map((l) => l.trim());
        const glyphChars = [...lines(await get(`${base}/symbols.txt`)).join("")];
        if (names.length !== glyphChars.length) continue;
        for (let i = 0; i < names.length; i++) if (isGlyphChar(glyphChars[i])) chars[names[i]] = glyphChars[i];
      }
      if (Object.keys(chars).length === 0) return;
      mkdirSync(environment.supportPath, { recursive: true });
      writeFileSync(GLYPH_CACHE_FILE, JSON.stringify({ fetchedAt: Date.now(), chars } satisfies FetchedGlyphs));
    } catch {
      // Offline or upstream hiccup — the bundled + previously fetched chars still apply.
    }
  })();
}

// ---------------------------------------------------------------------------
// Local icon cache: symbols are rendered to PNGs by the OS itself (see
// assets/render-symbols.js), so icons exist for every symbol the user's macOS
// knows and stay correct across OS updates — the cache is keyed by OS build.
// ---------------------------------------------------------------------------

const osBuild = (() => {
  try {
    return execFileSync("sw_vers", ["-buildVersion"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
})();

const ICONS_ROOT = join(environment.supportPath, "icons");
const ICON_DIR = join(ICONS_ROOT, osBuild);

const renderedIcons: Set<string> = (() => {
  try {
    mkdirSync(ICON_DIR, { recursive: true });
    // Icons for previous OS builds are stale (new/renamed symbols); drop them.
    for (const entry of readdirSync(ICONS_ROOT)) {
      if (entry !== osBuild) rmSync(join(ICONS_ROOT, entry), { recursive: true, force: true });
    }
    return new Set(
      readdirSync(ICON_DIR)
        .filter((f) => f.endsWith(".png"))
        .map((f) => f.slice(0, -4)),
    );
  } catch {
    return new Set();
  }
})();

export function localIconPath(name: string): string {
  return join(ICON_DIR, `${name}.png`);
}

export function hasLocalIcon(name: string): boolean {
  return renderedIcons.has(name);
}

// Names this macOS cannot render (e.g. from a fetched dataset newer than the
// OS); remembered per session so they are not retried on every search.
const unrenderable = new Set<string>();

// Set when osascript itself fails (crash, bad output): rendering is a
// progressive enhancement, so give up for the session and keep remote images.
let rendererBroken = false;

// Serialize osascript invocations so batches never pile up.
let renderQueue: Promise<number> = Promise.resolve(0);

/**
 * Renders the given symbols to the local icon cache (batched, serialized).
 * Resolves with the number of newly rendered icons. Never rejects — on a
 * renderer failure the remaining work is skipped and remote images stay in use.
 */
export function renderIcons(names: string[]): Promise<number> {
  const result = renderQueue.then(async () => {
    let rendered = 0;
    if (rendererBroken) return rendered;
    const missing = names.filter((name) => !renderedIcons.has(name) && !unrenderable.has(name));
    for (let i = 0; i < missing.length; i += RENDER_BATCH_SIZE) {
      const batch = missing.slice(i, i + RENDER_BATCH_SIZE);
      try {
        const { stdout } = await execFileAsync("osascript", [
          "-l",
          "JavaScript",
          `${environment.assetsPath}/render-symbols.js`,
          ICON_DIR,
          JSON.stringify(batch),
        ]);
        const { fail } = JSON.parse(stdout.trim()) as { ok: number; fail: string[] };
        const failed = new Set(fail);
        for (const name of batch) {
          if (failed.has(name)) unrenderable.add(name);
          else {
            renderedIcons.add(name);
            rendered++;
          }
        }
      } catch {
        rendererBroken = true;
        break;
      }
    }
    return rendered;
  });
  renderQueue = result;
  return result;
}
