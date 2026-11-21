import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { promisify } from "node:util";
import {
  BrewSnapshot,
  HomebrewStatus,
  OutdatedPackage,
  PackageCategory,
  PersistedState,
} from "./types";

const execFileAsync = promisify(execFile);
const STATE_KEY = "menubrew.state.v1";

interface Preferences {
  terminalApp: "iTerm" | "Terminal";
  enableNotifications: boolean;
}

function getBrewPath(): string {
  if (existsSync("/opt/homebrew/bin/brew")) return "/opt/homebrew/bin/brew";
  if (existsSync("/usr/local/bin/brew")) return "/usr/local/bin/brew";
  return "brew";
}

async function runCmd(
  bin: string,
  args: string[],
): Promise<{ ok: boolean; stdout: string }> {
  try {
    const { stdout } = await execFileAsync(bin, args, {
      env: {
        ...process.env,
        PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${process.env.PATH ?? ""}`,
        HOMEBREW_NO_AUTO_UPDATE: "1",
      },
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
    });
    return { ok: true, stdout };
  } catch {
    return { ok: false, stdout: "" };
  }
}

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function formatRelativeDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function upgradeCommandForPackage(pkg: OutdatedPackage): string {
  if (pkg.category === "Formulae (CLI)") return `brew upgrade ${pkg.name}`;
  return pkg.isGreedyOnly
    ? `brew upgrade --cask --greedy ${pkg.name}`
    : `brew upgrade --cask ${pkg.name}`;
}

export function upgradeCommandForCategory(
  category: PackageCategory,
  packages: OutdatedPackage[],
  includeGreedy: boolean,
): string {
  const names = packages.map((p) => p.name).join(" ");
  if (category === "Formulae (CLI)") return `brew upgrade --formula ${names}`;
  return includeGreedy
    ? `brew upgrade --cask --greedy ${names}`
    : `brew upgrade --cask ${names}`;
}

async function loadState(): Promise<PersistedState> {
  const raw = await LocalStorage.getItem<string>(STATE_KEY);
  if (!raw)
    return {
      trackedUpdates: {},
      updatesSeenSinceLastUpgrade: [],
      ignoredIds: [],
      sizeCache: {},
    };
  try {
    const parsed = JSON.parse(raw) as PersistedState;
    return {
      trackedUpdates: parsed.trackedUpdates ?? {},
      lastUpgradeAt: parsed.lastUpgradeAt,
      updatesSeenSinceLastUpgrade: parsed.updatesSeenSinceLastUpgrade ?? [],
      ignoredIds: parsed.ignoredIds ?? [],
      sizeCache: parsed.sizeCache ?? {},
    };
  } catch {
    return {
      trackedUpdates: {},
      updatesSeenSinceLastUpgrade: [],
      ignoredIds: [],
      sizeCache: {},
    };
  }
}

async function saveState(state: PersistedState): Promise<void> {
  await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function toggleIgnorePackage(id: string): Promise<boolean> {
  const state = await loadState();
  const set = new Set(state.ignoredIds ?? []);
  let ignored: boolean;
  if (set.has(id)) {
    set.delete(id);
    ignored = false;
  } else {
    set.add(id);
    ignored = true;
  }
  state.ignoredIds = Array.from(set);
  await saveState(state);
  return ignored;
}

async function checkHomebrewStatus(brew: string): Promise<HomebrewStatus> {
  const verRes = await runCmd(brew, ["--version"]);
  const version =
    verRes.stdout.split("\n")[0]?.replace("Homebrew ", "").trim() || "?";

  const repoRes = await runCmd(brew, ["--repository"]);
  const repoPath = repoRes.stdout.trim();
  if (!repoPath) return { version, isUpToDate: null, commitsBehind: 0 };

  await runCmd("/usr/bin/git", ["-C", repoPath, "fetch", "--quiet", "origin"]);
  const revRes = await runCmd("/usr/bin/git", [
    "-C",
    repoPath,
    "rev-list",
    "--count",
    "HEAD..@{u}",
  ]);
  if (revRes.ok) {
    const behind = Number.parseInt(revRes.stdout.trim(), 10);
    if (!Number.isNaN(behind)) {
      return { version, isUpToDate: behind === 0, commitsBehind: behind };
    }
  }
  return { version, isUpToDate: null, commitsBehind: 0 };
}

async function detectLastUpgradeFromDisk(
  brew: string,
): Promise<string | undefined> {
  const prefixRes = await runCmd(brew, ["--prefix"]);
  const prefix = prefixRes.stdout.trim();
  if (!prefix) return undefined;

  let latestMs = 0;
  for (const sub of ["Cellar", "Caskroom"]) {
    const dir = `${prefix}/${sub}`;
    if (!existsSync(dir)) continue;
    try {
      for (const entry of readdirSync(dir)) {
        const mtimeMs = statSync(`${dir}/${entry}`).mtimeMs;
        if (mtimeMs > latestMs) latestMs = mtimeMs;
      }
    } catch {
      // ignore unreadable entries
    }
  }
  return latestMs > 0 ? new Date(latestMs).toISOString() : undefined;
}

async function headSize(url: string): Promise<number | undefined> {
  try {
    const headers: Record<string, string> = {};
    if (url.includes("ghcr.io")) {
      headers["Authorization"] = "Bearer QQ==";
    }
    const resp = await fetch(url, {
      method: "HEAD",
      headers,
      signal: AbortSignal.timeout(7000),
    });
    const len = resp.headers.get("content-length");
    if (len) {
      const parsed = Number.parseInt(len, 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export async function fetchBrewSnapshot(
  notifyIfNew = false,
): Promise<BrewSnapshot> {
  const brew = getBrewPath();
  const nowIso = new Date().toISOString();
  const state = await loadState();

  const [greedyRes, stdRes, hbStatus, diskUpgrade] = await Promise.all([
    runCmd(brew, ["outdated", "--greedy", "--json=v2"]),
    runCmd(brew, ["outdated", "--json=v2"]),
    checkHomebrewStatus(brew),
    detectLastUpgradeFromDisk(brew),
  ]);

  if (
    diskUpgrade &&
    (!state.lastUpgradeAt || diskUpgrade > state.lastUpgradeAt)
  ) {
    state.lastUpgradeAt = diskUpgrade;
    state.updatesSeenSinceLastUpgrade = [];
  }

  type RawOutdated = {
    formulae?: Array<{
      name: string;
      installed_versions?: string[];
      current_version: string;
    }>;
    casks?: Array<{
      name: string;
      installed_versions?: string[] | string;
      current_version: string;
      auto_updates?: boolean;
    }>;
  };

  const greedyJson: RawOutdated = greedyRes.ok
    ? JSON.parse(greedyRes.stdout || "{}")
    : {};
  const stdJson: RawOutdated = stdRes.ok
    ? JSON.parse(stdRes.stdout || "{}")
    : {};

  const standardKeys = new Set<string>();
  for (const f of stdJson.formulae ?? []) standardKeys.add(`formula:${f.name}`);
  for (const c of stdJson.casks ?? []) standardKeys.add(`cask:${c.name}`);

  const rawItems: Array<{
    name: string;
    installed: string;
    latest: string;
    category: PackageCategory;
    isGreedyOnly: boolean;
  }> = [];

  for (const f of greedyJson.formulae ?? []) {
    rawItems.push({
      name: f.name,
      installed: (f.installed_versions ?? []).join(", ") || "?",
      latest: f.current_version,
      category: "Formulae (CLI)",
      isGreedyOnly: !standardKeys.has(`formula:${f.name}`),
    });
  }

  for (const c of greedyJson.casks ?? []) {
    const installed = Array.isArray(c.installed_versions)
      ? c.installed_versions.join(", ")
      : c.installed_versions || "?";
    rawItems.push({
      name: c.name,
      installed,
      latest: c.current_version,
      category: c.auto_updates
        ? "Casks (Auto-update / Greedy)"
        : "Casks (Apps)",
      isGreedyOnly: !standardKeys.has(`cask:${c.name}`),
    });
  }

  const currentIDs = new Set(rawItems.map((i) => `${i.category}:${i.name}`));
  const disappeared = Object.keys(state.trackedUpdates).filter(
    (id) => !currentIDs.has(id),
  );
  if (disappeared.length > 0) {
    state.lastUpgradeAt = diskUpgrade ?? nowIso;
    state.updatesSeenSinceLastUpgrade = Array.from(currentIDs);
    for (const oldId of disappeared) delete state.trackedUpdates[oldId];
  }

  const ignoredSet = new Set(state.ignoredIds ?? []);
  const newlyAddedIDs = new Set<string>();
  const seenSet = new Set(state.updatesSeenSinceLastUpgrade);
  for (const item of rawItems) {
    const id = `${item.category}:${item.name}`;
    const existing = state.trackedUpdates[id];
    if (!existing || existing.version !== item.latest) {
      state.trackedUpdates[id] = { version: item.latest, firstSeenAt: nowIso };
      if (!ignoredSet.has(id)) newlyAddedIDs.add(id);
    }
    seenSet.add(id);
  }
  state.updatesSeenSinceLastUpgrade = Array.from(seenSet);
  const totalSinceUpgrade = Math.max(
    state.updatesSeenSinceLastUpgrade.length,
    rawItems.length,
  );

  // Fetch taps, descriptions, homepages & URLs for size estimation
  const tapsByID: Record<string, string> = {};
  const descByID: Record<string, string> = {};
  const homepageByID: Record<string, string> = {};
  const urlsByID: Record<string, string> = {};
  const formulaNames = rawItems
    .filter((i) => i.category === "Formulae (CLI)")
    .map((i) => i.name);
  const caskNames = rawItems
    .filter((i) => i.category !== "Formulae (CLI)")
    .map((i) => i.name);

  if (formulaNames.length > 0) {
    const infoRes = await runCmd(brew, [
      "info",
      "--json=v2",
      "--formula",
      ...formulaNames,
    ]);
    if (infoRes.ok) {
      const parsed = JSON.parse(infoRes.stdout || "{}") as {
        formulae?: Array<{
          name: string;
          tap?: string;
          desc?: string;
          homepage?: string;
          bottle?: { stable?: { files?: Record<string, { url?: string }> } };
        }>;
      };
      const archKeys =
        process.arch === "arm64"
          ? ["arm64_sequoia", "arm64_sonoma", "arm64_ventura", "all"]
          : ["sequoia", "sonoma", "ventura", "all"];

      for (const f of parsed.formulae ?? []) {
        const id = `Formulae (CLI):${f.name}`;
        if (f.tap) tapsByID[id] = f.tap;
        if (f.desc) descByID[id] = f.desc;
        if (f.homepage) homepageByID[id] = f.homepage;
        const files = f.bottle?.stable?.files ?? {};
        for (const k of archKeys) {
          if (files[k]?.url) {
            urlsByID[id] = files[k].url;
            break;
          }
        }
        if (!urlsByID[id]) {
          const first = Object.values(files)[0];
          if (first?.url) urlsByID[id] = first.url;
        }
      }
    }
  }

  if (caskNames.length > 0) {
    const infoRes = await runCmd(brew, [
      "info",
      "--json=v2",
      "--cask",
      ...caskNames,
    ]);
    if (infoRes.ok) {
      const parsed = JSON.parse(infoRes.stdout || "{}") as {
        casks?: Array<{
          token: string;
          tap?: string;
          desc?: string;
          homepage?: string;
          url?: string;
          auto_updates?: boolean;
        }>;
      };
      for (const c of parsed.casks ?? []) {
        const cat: PackageCategory = c.auto_updates
          ? "Casks (Auto-update / Greedy)"
          : "Casks (Apps)";
        const id = `${cat}:${c.token}`;
        if (c.tap) tapsByID[id] = c.tap;
        if (c.desc) descByID[id] = c.desc;
        if (c.homepage) homepageByID[id] = c.homepage;
        if (c.url) urlsByID[id] = c.url;
      }
    }
  }

  // Use cached sizes when version matches; only HEAD-fetch uncached items
  const sizeCache = state.sizeCache ?? {};
  const sizesByID: Record<string, number | undefined> = {};
  const uncachedEntries: Array<[string, string, string]> = [];

  for (const item of rawItems) {
    const id = `${item.category}:${item.name}`;
    const cacheKey = `${id}@${item.latest}`;
    if (sizeCache[cacheKey]) {
      sizesByID[id] = sizeCache[cacheKey];
    } else if (urlsByID[id]) {
      uncachedEntries.push([id, cacheKey, urlsByID[id]]);
    }
  }

  if (uncachedEntries.length > 0) {
    const fetched = await Promise.all(
      uncachedEntries.map(
        async ([id, cacheKey, url]) =>
          [id, cacheKey, await headSize(url)] as const,
      ),
    );
    for (const [id, cacheKey, sz] of fetched) {
      if (sz) {
        sizesByID[id] = sz;
        sizeCache[cacheKey] = sz;
      }
    }
    state.sizeCache = sizeCache;
  }

  const packages: OutdatedPackage[] = rawItems
    .map((item) => {
      const id = `${item.category}:${item.name}`;
      return {
        id,
        name: item.name,
        installedVersion: item.installed,
        latestVersion: item.latest,
        category: item.category,
        tap: tapsByID[id],
        description: descByID[id],
        homepage: homepageByID[id],
        sizeBytes: sizesByID[id],
        firstSeenAt: state.trackedUpdates[id]?.firstSeenAt ?? nowIso,
        isOnlySinceLastUpgrade: totalSinceUpgrade === 1 && seenSet.has(id),
        totalSinceLastUpgrade: totalSinceUpgrade,
        isGreedyOnly: item.isGreedyOnly,
        isIgnored: ignoredSet.has(id),
      };
    })
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    );

  const newlyAdded = packages.filter((p) => newlyAddedIDs.has(p.id));
  await saveState(state);

  if (notifyIfNew && newlyAdded.length > 0) {
    const { enableNotifications } = getPreferenceValues<Preferences>();
    if (enableNotifications) {
      await sendNotification(newlyAdded);
    }
  }

  return {
    packages,
    homebrewStatus: hbStatus,
    lastUpgradeAt: state.lastUpgradeAt,
    newlyAdded,
    updatedAt: nowIso,
  };
}

async function sendNotification(packages: OutdatedPackage[]): Promise<void> {
  const title =
    packages.length === 1
      ? "New Homebrew Update"
      : `${packages.length} New Homebrew Updates`;
  const body =
    packages.length === 1
      ? `${packages[0].name} (${packages[0].installedVersion} → ${packages[0].latestVersion}) • ${formatBytes(packages[0].sizeBytes)}`
      : packages
          .slice(0, 4)
          .map((p) => p.name)
          .join(", ") + (packages.length > 4 ? "…" : "");

  const script = `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`;
  await runCmd("/usr/bin/osascript", ["-e", script]);
}

export async function runInTerminal(command: string): Promise<void> {
  const { terminalApp } = getPreferenceValues<Preferences>();
  const escaped = JSON.stringify(command);

  const script =
    terminalApp === "Terminal"
      ? `tell application "Terminal"
          activate
          do script ${escaped}
        end tell`
      : `tell application "iTerm"
          activate
          if (count of windows) = 0 then
            set newWindow to (create window with default profile)
            tell current session of newWindow
              write text ${escaped}
            end tell
          else
            tell current window
              set newTab to (create tab with default profile)
              tell current session of newTab
                write text ${escaped}
              end tell
            end tell
          end if
        end tell`;

  await runCmd("/usr/bin/osascript", ["-e", script]);
}
