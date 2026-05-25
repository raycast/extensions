import * as fs from "fs";
import * as path from "path";
import { runShell } from "./shell";
import { InstalledApp } from "./types";
import { getCachedUserSparkleFeed } from "./user-sparkle-feeds";

const APP_DIRS = [
  "/Applications",
  "/Applications/Utilities",
  `${process.env.HOME}/Applications`,
];
const EXCLUDED_DIRS = ["Setapp"];

async function plistJson(
  plistPath: string,
): Promise<Record<string, unknown> | null> {
  try {
    const { stdout } = await runShell(
      `/usr/bin/plutil -convert json -o - "${plistPath}.plist" 2>/dev/null`,
    );
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function findIcon(
  appPath: string,
  plist: Record<string, unknown> | null,
): string | undefined {
  const resources = path.join(appPath, "Contents/Resources");
  if (!fs.existsSync(resources)) return undefined;
  let iconName = (plist?.CFBundleIconFile as string) ?? "";
  if (!iconName) {
    // Newer apps use CFBundleIcons -> CFBundlePrimaryIcon -> CFBundleIconName
    const icons = plist?.CFBundleIcons as Record<string, unknown> | undefined;
    const primary = icons?.CFBundlePrimaryIcon as
      | Record<string, unknown>
      | undefined;
    iconName =
      (primary?.CFBundleIconName as string) ??
      (plist?.CFBundleIconName as string) ??
      "";
  }
  if (!iconName) return undefined;
  if (!iconName.endsWith(".icns")) iconName += ".icns";
  const fullPath = path.join(resources, iconName);
  return fs.existsSync(fullPath) ? fullPath : undefined;
}

function hasAppStoreReceipt(appPath: string): boolean {
  return fs.existsSync(path.join(appPath, "Contents/_MASReceipt/receipt"));
}

function isElectron(appPath: string): boolean {
  return (
    fs.existsSync(
      path.join(appPath, "Contents/Frameworks/Electron Framework.framework"),
    ) ||
    fs.existsSync(path.join(appPath, "Contents/Resources/app.asar")) ||
    fs.existsSync(path.join(appPath, "Contents/Resources/app"))
  );
}

/** Plist values are unknown JSON — coerce to string only if actually a string. */
function plistStr(plist: Record<string, unknown>, key: string): string {
  const v = plist[key];
  return typeof v === "string" ? v : "";
}

export async function readApp(appPath: string): Promise<InstalledApp | null> {
  try {
    const name = path.basename(appPath).replace(/\.app$/, "");
    const plistBase = path.join(appPath, "Contents/Info");
    const plist = await plistJson(plistBase);
    if (!plist) return null;

    const bundleId = plistStr(plist, "CFBundleIdentifier");
    if (!bundleId) return null;
    if (bundleId.startsWith("com.apple.InstallAssistant")) return null;
    const isApple = bundleId.startsWith("com.apple.");

    const version = plistStr(plist, "CFBundleShortVersionString");
    const buildNumber = plistStr(plist, "CFBundleVersion");
    if (!version && !buildNumber) return null;

    // User override wins over the plist SUFeedURL — lets the user "wire up"
    // a feed for apps where our auto-detection misses or parses poorly.
    const userFeed = getCachedUserSparkleFeed(bundleId);
    const plistFeedRaw = plistStr(plist, "SUFeedURL")
      .trim()
      .replace(/^["']|["']$/g, "");
    const plistFeed = plistFeedRaw || undefined;
    const sparkleFeedUrl = userFeed ?? plistFeed;
    const iconPath = findIcon(appPath, plist);

    return {
      name,
      appPath,
      bundleId,
      version,
      buildNumber,
      sparkleFeedUrl,
      hasAppStoreReceipt: hasAppStoreReceipt(appPath),
      isElectron: isElectron(appPath),
      isApple,
      iconPath,
    };
  } catch {
    // Any unexpected error (broken bundle, permission denied, etc.) → skip this app
    return null;
  }
}

export async function scanInstalledApps(): Promise<InstalledApp[]> {
  const seen = new Set<string>();
  const apps: InstalledApp[] = [];

  for (const dir of APP_DIRS) {
    if (!fs.existsSync(dir)) continue;
    let entries: string[] = [];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (EXCLUDED_DIRS.includes(entry)) continue;
      if (!entry.endsWith(".app")) continue;
      const fullPath = path.join(dir, entry);
      if (seen.has(fullPath)) continue;
      seen.add(fullPath);
    }
  }

  const paths = Array.from(seen);
  // Read in batches of 20 to avoid hammering defaults
  // 8 is plenty for plist reads. Higher batches spike RSS without measurable speedup.
  const BATCH = 8;
  for (let i = 0; i < paths.length; i += BATCH) {
    const slice = paths.slice(i, i + BATCH);
    const batch = await Promise.all(
      slice.map((p) => readApp(p).catch(() => null)),
    );
    for (const a of batch) if (a && !a.isApple) apps.push(a);
  }

  return apps;
}
