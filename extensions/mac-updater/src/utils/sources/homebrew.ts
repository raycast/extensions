import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";
import { extractCmdError, findBrew, run, runShell } from "../shell";
import { InstalledApp, UpdateInfo, UpdateResult, CliPackage } from "../types";
import { hasUpdate } from "../version";

const CASK_API = "https://formulae.brew.sh/api/cask.json";
const CASK_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function caskCachePath(): string {
  return path.join(environment.supportPath, "cask-api-v1.json");
}

// Slim entry — only the fields we actually read at runtime. The full cask.json
// entries are 3-5KB each and we have ~10,000 of them → ~30-50MB in RAM. Slimming
// down to these 4 fields (~200-500 bytes/entry) cuts the resident set to ~3-5MB.
// Anything else we'd want from a cask (description, depends_on, artifacts, etc.)
// we'll re-fetch on demand via the per-cask endpoint.
export interface CaskEntry {
  token: string;
  name: string[];
  version: string;
  homepage: string;
}

interface CaskIndex {
  byBundleId: Map<string, CaskEntry>;
  byName: Map<string, CaskEntry>;
  byToken: Map<string, CaskEntry>;
  fetchedAt: number;
}

let memCache: CaskIndex | null = null;

// Raw entry shape — we only see this transiently while building the index.
interface RawCaskEntry {
  token: string;
  name?: string[];
  version?: string;
  homepage?: string;
  artifacts?: unknown[];
}

/**
 * Parse the on-disk cask.json into the lookup index, slimming each entry to
 * only the fields we use. The raw parsed array is deliberately scoped to this
 * function so it becomes unreachable as soon as we return — letting V8's GC
 * reclaim the ~60MB of intermediate allocations.
 */
function parseAndIndex(raw: string, fetchedAt: number): CaskIndex {
  const parsed = JSON.parse(raw) as RawCaskEntry[];
  const byBundleId = new Map<string, CaskEntry>();
  const byName = new Map<string, CaskEntry>();
  const byToken = new Map<string, CaskEntry>();

  for (const entry of parsed) {
    if (!entry.token) continue;
    const slim: CaskEntry = {
      token: entry.token,
      name: entry.name ?? [],
      version: entry.version ?? "",
      homepage: entry.homepage ?? "",
    };
    byToken.set(slim.token, slim);
    for (const n of slim.name) {
      const key = n.toLowerCase().replace(/\.app$/, "");
      if (!byName.has(key)) byName.set(key, slim);
    }
    // Extract bundle IDs from zap/uninstall artifact blocks. We discard the
    // raw artifact arrays as soon as this loop body returns — only the
    // extracted bundle ID strings (a few per cask) live on.
    for (const art of entry.artifacts ?? []) {
      if (typeof art !== "object" || !art) continue;
      const obj = art as Record<string, unknown>;
      const zap = (obj.zap as Array<Record<string, unknown>> | undefined) ?? [];
      const uninstall =
        (obj.uninstall as Array<Record<string, unknown>> | undefined) ?? [];
      for (const block of [...zap, ...uninstall]) {
        for (const key of ["pkgutil", "quit", "launchctl", "delete", "trash"]) {
          const val = block[key];
          const arr = Array.isArray(val) ? val : val ? [val] : [];
          for (const v of arr) {
            if (typeof v === "string" && /^[a-z0-9]+\.[a-z0-9.-]+$/i.test(v)) {
              if (!byBundleId.has(v)) byBundleId.set(v, slim);
            }
          }
        }
      }
    }
  }

  return { byBundleId, byName, byToken, fetchedAt };
}

// cask.json is ~15MB — way larger than child_process.exec's default maxBuffer.
// Curl directly to a tmp file to skip stdout buffering, then read+parse and
// immediately discard the raw text/parsed array.
async function fetchAndIndex(targetPath: string): Promise<CaskIndex> {
  const tmp = targetPath + ".download";
  // execFile via run() — both `tmp` and CASK_API are trusted but routing
  // through execFile costs nothing and removes any future shell-quoting hazard.
  await run("/usr/bin/curl", [
    "-fsSL",
    "--max-time",
    "90",
    "-o",
    tmp,
    CASK_API,
  ]);
  const size = fs.statSync(tmp).size;
  if (size < 1_000_000) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    throw new Error(`cask.json fetch returned only ${size} bytes`);
  }
  const raw = fs.readFileSync(tmp, "utf8");
  const index = parseAndIndex(raw, Date.now());
  // Atomic move into place after we have a valid parse
  try {
    fs.renameSync(tmp, targetPath);
  } catch {
    /* leave tmp; we have the data */
  }
  return index;
}

export async function getCaskIndex(): Promise<CaskIndex> {
  if (memCache && Date.now() - memCache.fetchedAt < CASK_CACHE_TTL)
    return memCache;

  const cachePath = caskCachePath();
  try {
    if (fs.existsSync(cachePath)) {
      const stat = fs.statSync(cachePath);
      if (Date.now() - stat.mtimeMs < CASK_CACHE_TTL) {
        const raw = fs.readFileSync(cachePath, "utf8");
        memCache = parseAndIndex(raw, stat.mtimeMs);
        return memCache;
      }
    }
  } catch {
    // Corrupt or truncated cache file — delete it so the fetch below writes a clean one.
    try {
      fs.unlinkSync(cachePath);
    } catch {
      /* ignore */
    }
  }

  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    memCache = await fetchAndIndex(cachePath);
    return memCache;
  } catch (e) {
    // If fetch failed but we have a stale disk cache, use it rather than nothing
    try {
      if (fs.existsSync(cachePath)) {
        const raw = fs.readFileSync(cachePath, "utf8");
        memCache = parseAndIndex(raw, fs.statSync(cachePath).mtimeMs);
        return memCache;
      }
    } catch {
      // ignore
    }
    throw e;
  }
}

function slugVariants(name: string): string[] {
  const lower = name.toLowerCase();
  const variants = new Set<string>();
  variants.add(lower);
  variants.add(lower.replace(/\s+/g, "-"));
  variants.add(lower.replace(/\s+/g, ""));
  // Only strip a trailing " app" suffix (cosmetic) — never beta/preview/nightly/canary
  // since those almost always have separate casks or no cask at all (false matches
  // like "Raycast Beta" → "raycast" wreck adoption flows).
  const stripped = lower.replace(/\s+app$/i, "").trim();
  if (stripped !== lower) {
    variants.add(stripped);
    variants.add(stripped.replace(/\s+/g, "-"));
    variants.add(stripped.replace(/\s+/g, ""));
  }
  return Array.from(variants);
}

export function findCaskFor(
  app: InstalledApp,
  index: CaskIndex,
): CaskEntry | null {
  // 1. exact bundle ID
  const byId = index.byBundleId.get(app.bundleId);
  if (byId) return byId;
  // 2. exact app name in cask's `name` array
  const byName = index.byName.get(app.name.toLowerCase());
  if (byName) return byName;
  // 3. token match using slug variants — O(1) lookup against the byToken map
  for (const v of slugVariants(app.name)) {
    const hit = index.byToken.get(v);
    if (hit) return hit;
  }
  // 4. bundle ID prefix match (e.g. com.tinyspeck.slackmacgap → look for "slack")
  const bundleParts = app.bundleId.toLowerCase().split(".");
  // skip generic TLDs (com, io, ai, app, dev, org, net)
  const candidates = bundleParts.filter(
    (p) => !["com", "io", "ai", "app", "dev", "org", "net", "co"].includes(p),
  );
  for (const p of candidates) {
    const hit = index.byToken.get(p);
    if (hit) return hit;
  }
  return null;
}

export async function checkHomebrewCask(
  app: InstalledApp,
  index: CaskIndex,
): Promise<UpdateInfo | null> {
  // Prefer a direct lookup if we already know the token (Caskroom-mapped or fuzzy-matched).
  let cask: CaskEntry | null = null;
  if (app.suggestedCask) {
    cask = index.byToken.get(app.suggestedCask) ?? null;
  }
  if (!cask) cask = findCaskFor(app, index);

  // Resolve a token regardless of whether the API index has entries.
  // If the app is brew-managed via Caskroom, suggestedCask is already set,
  // so we can still produce a useful UpdateInfo even when the API failed.
  const token = cask?.token ?? app.suggestedCask;
  if (!token) return null;

  const latest = cask?.version?.split(",")[0] ?? app.version;
  return {
    app,
    source: "homebrew-cask",
    latestVersion: latest,
    hasUpdate: cask ? hasUpdate(app.version, app.buildNumber, latest) : false,
    caskToken: token,
    releaseNotesUrl: cask?.homepage,
    checkedAt: Date.now(),
  };
}

// Read brew-installed casks directly from the filesystem.
// Faster and more reliable than `brew list --cask` (which can fail in
// Raycast's restricted shell env, leaving us with no managed-by-brew signal).
const CASKROOMS = ["/opt/homebrew/Caskroom", "/usr/local/Caskroom"];

export async function getInstalledCaskTokens(): Promise<Set<string>> {
  const set = new Set<string>();
  for (const room of CASKROOMS) {
    if (!fs.existsSync(room)) continue;
    try {
      for (const entry of fs.readdirSync(room)) {
        if (entry.startsWith(".")) continue;
        const sub = `${room}/${entry}`;
        try {
          if (fs.statSync(sub).isDirectory()) set.add(entry);
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }
  return set;
}

/**
 * Authoritative app-path → cask-token mapping built by scanning Caskroom.
 *
 * Each cask's payload lives at /opt/homebrew/Caskroom/{token}/{version}/Name.app.
 * Homebrew then "installs" by either symlinking or copying to /Applications/Name.app.
 * Either way, the .app filename matches, so we can map any installed .app's filename
 * back to its source cask token. This is independent of the cask JSON API.
 */
export async function getBrewAppMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>(); // appFileName (e.g. "Claude.app") → token
  for (const room of CASKROOMS) {
    if (!fs.existsSync(room)) continue;
    let tokens: string[] = [];
    try {
      tokens = fs.readdirSync(room).filter((e) => !e.startsWith("."));
    } catch {
      continue;
    }
    for (const token of tokens) {
      const tokenDir = `${room}/${token}`;
      let versions: string[] = [];
      try {
        versions = fs.readdirSync(tokenDir).filter((e) => !e.startsWith("."));
      } catch {
        continue;
      }
      // Look in each version directory (usually one); record .app filenames
      for (const version of versions) {
        const versionDir = `${tokenDir}/${version}`;
        try {
          const stat = fs.statSync(versionDir);
          if (!stat.isDirectory()) continue;
          for (const item of fs.readdirSync(versionDir)) {
            if (item.endsWith(".app")) {
              // First version we see wins; subsequent (older) versions don't overwrite
              if (!map.has(item)) map.set(item, token);
            }
          }
        } catch {
          // ignore
        }
      }
    }
  }
  return map;
}

// Read brew-installed formulae directly from /opt/homebrew/Cellar.
const CELLARS = ["/opt/homebrew/Cellar", "/usr/local/Cellar"];

export async function getInstalledFormulaeTokens(): Promise<Set<string>> {
  const set = new Set<string>();
  for (const cellar of CELLARS) {
    if (!fs.existsSync(cellar)) continue;
    try {
      for (const entry of fs.readdirSync(cellar)) {
        if (entry.startsWith(".")) continue;
        set.add(entry);
      }
    } catch {
      // ignore
    }
  }
  return set;
}

export interface InstalledFormula {
  name: string;
  installedVersion: string;
}

export async function getAllInstalledFormulae(): Promise<InstalledFormula[]> {
  const out: InstalledFormula[] = [];
  for (const cellar of CELLARS) {
    if (!fs.existsSync(cellar)) continue;
    let names: string[] = [];
    try {
      names = fs.readdirSync(cellar).filter((e) => !e.startsWith("."));
    } catch {
      continue;
    }
    for (const name of names) {
      const dir = `${cellar}/${name}`;
      try {
        const versions = fs
          .readdirSync(dir)
          .filter((e) => !e.startsWith("."))
          .sort();
        if (versions.length === 0) continue;
        out.push({ name, installedVersion: versions[versions.length - 1] });
      } catch {
        // ignore
      }
    }
  }
  return out;
}

const NO_BREW_ERROR = "Homebrew is not installed. Visit brew.sh to install it.";

function noBrewResult(
  name: string,
  source: UpdateResult["source"],
): UpdateResult {
  return { name, source, success: false, error: NO_BREW_ERROR };
}

export async function getOutdatedFormulae(): Promise<CliPackage[]> {
  const brew = findBrew();
  if (!brew) return [];
  try {
    const { stdout } = await run(brew, ["outdated", "--formula", "--json=v2"]);
    const data = JSON.parse(stdout);
    return (data.formulae ?? []).map(
      (f: {
        name: string;
        installed_versions: string[];
        current_version: string;
      }) => ({
        id: f.name,
        name: f.name,
        currentVersion: f.installed_versions.join(", "),
        latestVersion: f.current_version,
        source: "homebrew-formula" as const,
      }),
    );
  } catch {
    return [];
  }
}

export async function brewUpdateIndex(): Promise<void> {
  const brew = findBrew();
  if (!brew) return;
  try {
    await run(brew, ["update", "--quiet"]);
  } catch {
    // soft fail
  }
}

export async function upgradeCask(token: string): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) return noBrewResult(token, "homebrew-cask");
  try {
    await runShell(`${brew} upgrade --cask --greedy "${token}" 2>&1`);
    return { name: token, source: "homebrew-cask", success: true };
  } catch (e) {
    return {
      name: token,
      source: "homebrew-cask",
      success: false,
      error: extractCmdError(e),
    };
  }
}

export async function installCask(
  token: string,
  force = true,
): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) return noBrewResult(token, "homebrew-cask");

  // Multi-strategy install for seamless adoption.
  // Strategy A: `--force --adopt` (brew 4.4+: takes over the existing app in-place)
  // Strategy B: `--force` (overwrites existing /Applications/Foo.app)
  const strategies: string[][] = force
    ? [["--force", "--adopt"], ["--force"]]
    : [[]];

  let lastError = "Unknown error";
  for (const flags of strategies) {
    try {
      const argstr = flags.length ? flags.join(" ") + " " : "";
      await runShell(`${brew} install --cask ${argstr}"${token}"`);
      return { name: token, source: "homebrew-cask", success: true };
    } catch (e) {
      lastError = extractCmdError(e);
      // If --adopt isn't supported on this brew version, fall through to --force only
      if (/unknown option.*--adopt|invalid option.*--adopt/i.test(lastError))
        continue;
      // If brew rejects because an app is already in place, the next strategy (--force) overwrites it
      if (/already (an? )?app at|already installed/i.test(lastError)) continue;
      // Other failure — no point retrying
      break;
    }
  }
  return {
    name: token,
    source: "homebrew-cask",
    success: false,
    error: lastError,
  };
}

export async function upgradeFormula(name: string): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) return noBrewResult(name, "homebrew-formula");
  try {
    await run(brew, ["upgrade", name]);
    return { name, source: "homebrew-formula", success: true };
  } catch (e) {
    return {
      name,
      source: "homebrew-formula",
      success: false,
      error: extractCmdError(e),
    };
  }
}

export async function upgradeAllBrew(): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) return noBrewResult("Homebrew (all)", "homebrew-cask");
  try {
    await runShell(`${brew} upgrade --greedy 2>&1`);
    return { name: "Homebrew (all)", source: "homebrew-cask", success: true };
  } catch (e) {
    return {
      name: "Homebrew (all)",
      source: "homebrew-cask",
      success: false,
      error: extractCmdError(e),
    };
  }
}

/** True if Homebrew is installed somewhere we recognise. */
export function isHomebrewInstalled(): boolean {
  return findBrew() !== null;
}
