import { execFile } from "child_process";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { promisify } from "util";
import type { AppUpdate } from "./types";

const execFileAsync = promisify(execFile);

type AppInfo = {
  name: string;
  version: string;
  feedUrl: string;
  appPath: string;
  bundleId: string;
};

async function readPlistKey(plistPath: string, key: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("defaults", ["read", plistPath, key]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

function listApps(dir: string): { name: string; path: string }[] {
  try {
    return readdirSync(dir)
      .filter((e) => e.endsWith(".app"))
      .map((e) => ({ name: e, path: `${dir}/${e}` }));
  } catch {
    return [];
  }
}

async function getSparkleApps(): Promise<AppInfo[]> {
  const appsDirs = ["/Applications", `${homedir()}/Applications`];
  const apps: AppInfo[] = [];

  const allApps = appsDirs.flatMap((dir) => listApps(dir));

  const checks = allApps.map(async (app) => {
    const plistPath = `${app.path}/Contents/Info`;
    const plistFile = `${app.path}/Contents/Info.plist`;

    if (!existsSync(plistFile)) return;

    const feedUrl = await readPlistKey(plistPath, "SUFeedURL");
    if (!feedUrl || feedUrl === "NULL") return;

    const [name, version, bundleId] = await Promise.all([
      readPlistKey(plistPath, "CFBundleName"),
      readPlistKey(plistPath, "CFBundleShortVersionString"),
      readPlistKey(plistPath, "CFBundleIdentifier"),
    ]);

    apps.push({
      name: name || app.name.replace(".app", ""),
      version: version || "unknown",
      feedUrl,
      appPath: app.path,
      bundleId: bundleId || "",
    });
  });

  await Promise.all(checks);
  return apps;
}

function extractLatestVersion(xml: string): { version: string; url: string } | null {
  // Sparkle appcast items can use either:
  //   - XML elements: <sparkle:shortVersionString>1.2.3</sparkle:shortVersionString>
  //   - Attributes on <enclosure>: sparkle:shortVersionString="1.2.3"
  // We need to parse the first <item> only (latest version)

  const firstItem = xml.match(/<item[\s>]([\s\S]*?)<\/item>/);
  if (!firstItem) return null;
  const item = firstItem[1];

  // Try element form first, then attribute form
  const shortVersionEl = item.match(/<sparkle:shortVersionString>([^<]+)<\/sparkle:shortVersionString>/);
  const shortVersionAttr = item.match(/sparkle:shortVersionString="([^"]+)"/);
  const versionEl = item.match(/<sparkle:version>([^<]+)<\/sparkle:version>/);
  const versionAttr = item.match(/sparkle:version="([^"]+)"/);

  const version = shortVersionEl?.[1] || shortVersionAttr?.[1] || versionEl?.[1] || versionAttr?.[1];
  if (!version) return null;

  // Match only the direct enclosure URL (not delta enclosures)
  const urlMatch = item.match(/<enclosure[^>]+url="([^"]+)"/);

  return {
    version: version.trim(),
    url: urlMatch?.[1] || "",
  };
}

function compareVersions(current: string, latest: string): boolean {
  // Returns true if latest > current
  const normalize = (v: string) =>
    v.split(/[.-]/).map((p) => {
      const num = parseInt(p, 10);
      return Number.isNaN(num) ? 0 : num;
    });

  const a = normalize(current);
  const b = normalize(latest);
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const av = a[i] || 0;
    const bv = b[i] || 0;
    if (bv > av) return true;
    if (bv < av) return false;
  }
  return false;
}

async function fetchAppcast(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Sparkle/2.0" },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

const BATCH_SIZE = 5;

async function checkApp(app: AppInfo): Promise<AppUpdate | null> {
  const xml = await fetchAppcast(app.feedUrl);
  if (!xml) {
    console.log(`[Sparkle] Failed to fetch appcast for ${app.name}: ${app.feedUrl}`);
    return null;
  }

  const latest = extractLatestVersion(xml);
  if (!latest) {
    console.log(`[Sparkle] Failed to parse version from appcast for ${app.name}`);
    return null;
  }

  if (!compareVersions(app.version, latest.version)) return null;

  return {
    name: app.name,
    currentVersion: app.version,
    latestVersion: latest.version,
    source: "sparkle",
    downloadUrl: latest.url || app.feedUrl,
    appPath: app.appPath,
    bundleId: app.bundleId,
  };
}

export async function scanSparkleUpdates(onProgress?: (current: number, total: number) => void): Promise<AppUpdate[]> {
  const apps = await getSparkleApps();
  const updates: AppUpdate[] = [];

  for (let i = 0; i < apps.length; i += BATCH_SIZE) {
    const batch = apps.slice(i, i + BATCH_SIZE);
    onProgress?.(Math.min(i + BATCH_SIZE, apps.length), apps.length);

    const results = await Promise.all(batch.map(checkApp));
    for (const result of results) {
      if (result) updates.push(result);
    }
  }

  return updates;
}
