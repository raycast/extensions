import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";
import {
  CommandTimeoutError,
  extractCmdError,
  findBrew,
  run,
  runShellWithTimeout,
  runWithTimeout,
} from "../shell";
import { quitAppIfRunning } from "../process-control";
import { getAskpassScript } from "../sudo-askpass";
import { InstalledApp, UpdateInfo, UpdateResult, CliPackage } from "../types";
import { hasUpdate } from "../version";

// Most updates finish in <60s; pkg-based casks like google-drive sometimes take
// 2-3 minutes because the .pkg installer itself is slow, plus time for the user
// to answer the password dialog. 5 minutes is generous without leaving Raycast
// hanging forever on a wedged sudo prompt.
const BREW_UPGRADE_TIMEOUT_MS = 5 * 60 * 1000;
// Bulk upgrades can touch many casks (each possibly a .pkg). Give plenty of room.
const BREW_BULK_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Turn a raw brew failure into something a human can act on. Covers the two
 * pkg-cask failure modes that aren't obvious from brew's own text:
 *   - CommandTimeoutError → we killed a hung run (most often the password
 *     dialog went unanswered).
 *   - "Broken pipe" / sudo-auth text → the admin password was needed for a
 *     .pkg installer but wasn't provided (user hit Cancel, or auth failed).
 */
function humanizeBrewError(err: unknown, raw: string): string {
  if (err instanceof CommandTimeoutError) {
    return "The update timed out. If a password dialog appeared, run it again and enter your password promptly.";
  }
  if (
    /broken pipe|a password is required|sorry, try again|incorrect password|authentication (failure|error)|with administrator/i.test(
      raw,
    )
  ) {
    return "This app installs via a macOS .pkg and needs your administrator password. Run the update again and enter your password when the dialog appears.";
  }
  if (looksLikeBadDownload(raw)) {
    return "The download was corrupted and couldn't be mounted, even after re-fetching. Check your network and try again, or update the app from its own updater.";
  }
  return raw;
}

/**
 * True when a cask failure points at a corrupt/truncated *download* rather than
 * an install problem. Homebrew's sha256 check can pass on a stale cache file
 * whose payload is actually bad, so the failure only surfaces later when
 * hdiutil can't mount the DMG ("no mountable file systems"), the convert step
 * exits non-zero, or brew rolls the install back ("Reverting upgrade"). The
 * remedy is to re-download with `brew fetch --force` and try once more.
 */
function looksLikeBadDownload(raw: string): boolean {
  return /no mountable file systems|hdiutil.*exited with|reverting upgrade|checksum (does not match|mismatch)|sha256 mismatch|corrupt|truncat/i.test(
    raw,
  );
}

/**
 * Homebrew 4.6+ can require third-party taps to be explicitly "trusted" (when
 * HOMEBREW_REQUIRE_TAP_TRUST is set). A bulk upgrade then fails with e.g.
 * "Warning: The following taps are not trusted: kde-mac/kde theboredteam/...".
 *
 * Parse the tap names out of that message and run `brew trust --tap <name>` for
 * each — the user already installed apps from these taps, so trusting them on
 * upgrade is expected. Returns true if at least one tap was trusted (caller
 * should then retry the operation). Best-effort: never throws.
 */
async function trustUntrustedTaps(brew: string, raw: string): Promise<boolean> {
  const m = raw.match(/not trusted:\s*([^\n]+)/i);
  if (!m) return false;
  const taps = m[1].match(/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/g) ?? [];
  let trustedAny = false;
  for (const tap of taps) {
    try {
      await run(brew, ["trust", "--tap", tap]);
      trustedAny = true;
    } catch {
      /* ignore — a tap we can't trust just won't retry-succeed */
    }
  }
  return trustedAny;
}

const CASK_API = "https://formulae.brew.sh/api/cask.json";
const CASK_CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function caskCachePath(): string {
  return path.join(environment.supportPath, "cask-api-v1.json");
}

// Cask index types + the memory-frugal Buffer parser live in ../cask-index
// (kept dependency-free for unit testing). Re-export CaskEntry for existing
// import sites.
import { type CaskEntry, type CaskIndex, parseAndIndex } from "../cask-index";
export type { CaskEntry };

let memCache: CaskIndex | null = null;

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
  // Read as a Buffer (off-heap) so parseAndIndex can slice entries without
  // putting the whole 15MB on the JS heap.
  const buf = fs.readFileSync(tmp);
  const index = parseAndIndex(buf, Date.now());
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
        memCache = parseAndIndex(fs.readFileSync(cachePath), stat.mtimeMs);
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
        memCache = parseAndIndex(
          fs.readFileSync(cachePath),
          fs.statSync(cachePath).mtimeMs,
        );
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
  outdatedCasks?: Map<string, OutdatedCask>,
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

  const latestFromCaskApi = cask?.version?.split(",")[0] ?? app.version;

  // Authoritative path: if the app is brew-managed AND we have brew's own
  // outdated list, trust brew. This eliminates every version-mismatch edge case
  // (Google Drive's short-vs-build, opaque cask versions like "5.0.0,6",
  // auto-updating apps that silently bumped past the cask) in one shot —
  // brew is the entity that would do the upgrade, so its verdict is final.
  //
  // If brew is silent on this token, it's NOT outdated as far as brew is
  // concerned. We deliberately set hasUpdate=false rather than falling through
  // to the plist heuristic, because that's what produced the sticky-flag bug
  // we're trying to kill.
  if (app.managedByBrew && outdatedCasks) {
    const brewSays = outdatedCasks.get(token);
    if (brewSays) {
      return {
        app,
        source: "homebrew-cask",
        latestVersion: brewSays.latestVersion,
        hasUpdate: true,
        caskToken: token,
        releaseNotesUrl: cask?.homepage,
        checkedAt: Date.now(),
      };
    }
    return {
      app,
      source: "homebrew-cask",
      latestVersion: latestFromCaskApi,
      hasUpdate: false,
      caskToken: token,
      releaseNotesUrl: cask?.homepage,
      checkedAt: Date.now(),
    };
  }

  // Fallback path (unmanaged adoption candidates, or when brew outdated failed):
  // use the cask API's declared version with the heuristic version compare.
  return {
    app,
    source: "homebrew-cask",
    latestVersion: latestFromCaskApi,
    hasUpdate: cask
      ? hasUpdate(app.version, app.buildNumber, latestFromCaskApi)
      : false,
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

export interface OutdatedCask {
  /** What brew thinks is currently installed. Useful for the "you're on X" UI. */
  currentVersion: string;
  /** The version brew would upgrade you to. */
  latestVersion: string;
}

/**
 * Ask brew directly which casks it considers outdated. This is THE authoritative
 * source for brew-managed apps — far more reliable than comparing the cask's
 * declared version against the app's CFBundleShortVersionString, because:
 *
 *  - Apps like Google Drive expose "126.0" as the short version but the cask
 *    tracks "126.0.4" (the build); a naive compare flags it as outdated forever.
 *  - Some casks use opaque version strings (e.g. "5.0.0,6") that don't appear
 *    anywhere in the .app's plist — no textual compare can match them.
 *  - Brew already does the bookkeeping in Caskroom/<token>/.metadata/ and
 *    knows its own "is this current?" answer.
 *
 * `--greedy` makes brew include casks whose `auto_updates` flag is true (most
 * Mac apps that ship their own updater) — without it brew silently skips them
 * and we'd never see google-drive in the list.
 *
 * Returns an empty map on any failure so callers can transparently fall back
 * to the plist-vs-cask-version heuristic.
 */
export async function getOutdatedCasks(): Promise<Map<string, OutdatedCask>> {
  const brew = findBrew();
  if (!brew) return new Map();
  try {
    const { stdout } = await runWithTimeout(
      brew,
      ["outdated", "--cask", "--greedy", "--json=v2"],
      45_000, // network-bound (brew may refresh index)
    );
    const data = JSON.parse(stdout) as {
      casks?: Array<{
        name: string;
        installed_versions?: string[];
        current_version?: string;
      }>;
    };
    const map = new Map<string, OutdatedCask>();
    for (const c of data.casks ?? []) {
      if (!c.name || !c.current_version) continue;
      map.set(c.name, {
        currentVersion: (c.installed_versions ?? []).join(", "),
        latestVersion: c.current_version,
      });
    }
    return map;
  } catch {
    return new Map();
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

/**
 * Pick the right "greedy" flag for a token. Most third-party taps that ship
 * GUI apps with their own auto-updaters need `--greedy` to be considered for
 * upgrade. The kde-mac tap goes one step further: many of its casks track
 * nightly builds from KDE's Binary Factory and only show up with
 * `--greedy-latest`. Same idea for any other "nightly tracking" tap we add
 * later — extend the prefix list rather than the call sites.
 *
 * Detection is by tap prefix in the token (owner/repo/name form) so we don't
 * need a reverse lookup into the known-installs registry on every call.
 */
function greedyFlagFor(token: string): "--greedy" | "--greedy-latest" {
  if (/^kde-mac\/kde\//i.test(token)) return "--greedy-latest";
  return "--greedy";
}

/**
 * Upgrade a single cask, with three resilience layers stacked:
 *   1. Quit the running app first — brew can't replace /Applications/Foo.app
 *      while macOS holds it open, and pkg-based installers often fail silently
 *      mid-install when the target is in use.
 *   2. SUDO_ASKPASS — .pkg casks (google-drive, microsoft-teams, docker…) make
 *      brew run `sudo` to (un)install the package. With no TTY that normally
 *      dies with "Broken pipe". Pointing SUDO_ASKPASS at our helper makes brew
 *      use `sudo -A`, which pops a native password dialog. brew still runs as
 *      the user (running brew itself as root is unsupported). The helper is
 *      only ever invoked when sudo is actually needed, so plain drag-to-Apps
 *      casks never trigger a prompt.
 *   3. 5-minute hard timeout — so a dialog the user never answers can't wedge
 *      the toast forever.
 */
export async function upgradeCask(
  token: string,
  appName?: string,
): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) return noBrewResult(token, "homebrew-cask");

  // Step 1: quit the app if we know its display name and it's running.
  // Best-effort — never blocks the update.
  if (appName) {
    try {
      await quitAppIfRunning(appName);
    } catch {
      /* ignore */
    }
  }

  const greedyFlag = greedyFlagFor(token);
  const doUpgrade = () =>
    runWithTimeout(
      brew,
      ["upgrade", "--cask", greedyFlag, token],
      BREW_UPGRADE_TIMEOUT_MS,
      { SUDO_ASKPASS: getAskpassScript() },
    );

  try {
    await doUpgrade();
    return { name: token, source: "homebrew-cask", success: true };
  } catch (e) {
    const raw = extractCmdError(e);
    // Untrusted third-party tap (HOMEBREW_REQUIRE_TAP_TRUST). Trust the listed
    // taps via `brew trust --tap` and retry once. The message may list taps
    // unrelated to this cask, so we parse them from the error rather than
    // guessing from the token.
    if (/not trusted/i.test(raw)) {
      try {
        if (await trustUntrustedTaps(brew, raw)) {
          await doUpgrade();
          return { name: token, source: "homebrew-cask", success: true };
        }
      } catch (e2) {
        return {
          name: token,
          source: "homebrew-cask",
          success: false,
          error: humanizeBrewError(e2, extractCmdError(e2)),
        };
      }
    }
    // Corrupt/truncated cached download (e.g. an LZMA DMG that won't mount):
    // re-fetch the artifact fresh and retry the upgrade once. This is the
    // single most common transient cask failure — a stale download in
    // ~/Library/Caches/Homebrew that passed sha but won't mount.
    if (looksLikeBadDownload(raw)) {
      try {
        await runWithTimeout(
          brew,
          ["fetch", "--force", "--cask", token],
          BREW_BULK_TIMEOUT_MS,
        );
        await doUpgrade();
        return { name: token, source: "homebrew-cask", success: true };
      } catch (e2) {
        return {
          name: token,
          source: "homebrew-cask",
          success: false,
          error: humanizeBrewError(e2, extractCmdError(e2)),
        };
      }
    }
    return {
      name: token,
      source: "homebrew-cask",
      success: false,
      error: humanizeBrewError(e, raw),
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
      // execFile arg-array (no shell) + SUDO_ASKPASS so .pkg casks that need
      // root on first install get a native password dialog instead of dying
      // with "Broken pipe" in Raycast's non-interactive process.
      await runWithTimeout(
        brew,
        ["install", "--cask", ...flags, token],
        BREW_UPGRADE_TIMEOUT_MS,
        { SUDO_ASKPASS: getAskpassScript() },
      );
      return { name: token, source: "homebrew-cask", success: true };
    } catch (e) {
      lastError = humanizeBrewError(e, extractCmdError(e));
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
  // Formulae rarely need sudo (they live under /opt/homebrew which the user
  // owns), but we still bound it on a timeout so the UI can't lock up if a
  // formula's post-install script wedges on a prompt.
  const doUpgrade = () =>
    runWithTimeout(brew, ["upgrade", name], BREW_UPGRADE_TIMEOUT_MS);
  try {
    await doUpgrade();
    return { name, source: "homebrew-formula", success: true };
  } catch (e) {
    const raw = extractCmdError(e);
    // Untrusted third-party tap → trust the listed taps and retry once.
    if (/not trusted/i.test(raw)) {
      try {
        if (await trustUntrustedTaps(brew, raw)) {
          await doUpgrade();
          return { name, source: "homebrew-formula", success: true };
        }
      } catch (e2) {
        return {
          name,
          source: "homebrew-formula",
          success: false,
          error: humanizeBrewError(e2, extractCmdError(e2)),
        };
      }
    }
    return {
      name,
      source: "homebrew-formula",
      success: false,
      error: humanizeBrewError(e, raw),
    };
  }
}

/**
 * Bulk-upgrade Homebrew *formulae* only (CLI tools), never casks. Formulae are
 * reliable, live under the user-owned prefix, and don't have the tap-trust /
 * pkg-sudo quirks that make casks worth upgrading one-by-one. `--formula`
 * scopes the command so it never re-touches casks (which we now handle per-cask
 * via upgradeCask).
 */
export async function upgradeAllFormulae(): Promise<UpdateResult> {
  const brew = findBrew();
  if (!brew) return noBrewResult("Homebrew CLI tools", "homebrew-formula");
  const doUpgrade = () =>
    runShellWithTimeout(`${brew} upgrade --formula 2>&1`, BREW_BULK_TIMEOUT_MS);
  try {
    await doUpgrade();
    return {
      name: "Homebrew CLI tools",
      source: "homebrew-formula",
      success: true,
    };
  } catch (e) {
    const raw = extractCmdError(e);
    // Bulk `brew upgrade --formula` scans every tap, so an untrusted third-party
    // tap (even a cask-only one) fails the whole run. Trust the listed taps and
    // retry once.
    if (/not trusted/i.test(raw)) {
      try {
        if (await trustUntrustedTaps(brew, raw)) {
          await doUpgrade();
          return {
            name: "Homebrew CLI tools",
            source: "homebrew-formula",
            success: true,
          };
        }
      } catch (e2) {
        return {
          name: "Homebrew CLI tools",
          source: "homebrew-formula",
          success: false,
          error: humanizeBrewError(e2, extractCmdError(e2)),
        };
      }
    }
    return {
      name: "Homebrew CLI tools",
      source: "homebrew-formula",
      success: false,
      error: humanizeBrewError(e, raw),
    };
  }
}

/** True if Homebrew is installed somewhere we recognise. */
export function isHomebrewInstalled(): boolean {
  return findBrew() !== null;
}
