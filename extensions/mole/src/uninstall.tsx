import { List, Icon, ActionPanel, Action, Alert, showToast, Toast, confirmAlert, trash } from "@raycast/api";
import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import { showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { getMolePathSafe } from "./utils/mole";
import { formatBytes } from "./utils/parsers";
import { execFile } from "child_process";

interface AppInfo {
  name: string;
  path: string;
  size: number;
  lastModified: Date;
}

interface ResidualFile {
  path: string;
  size: number;
  location: string;
}

interface AppIdentifiers {
  bundleId: string | null;
  bundleName: string | null;
  displayName: string | null;
  executableName: string | null;
}

const HOME = process.env.HOME || "";

const USER_LIBRARY_DIRS = [
  "Application Scripts",
  "Application Support",
  "Application Support/CrashReporter",
  "Caches",
  "Containers",
  "Cookies",
  "Group Containers",
  "HTTPStorages",
  "Internet Plug-Ins",
  "LaunchAgents",
  "Logs",
  "Logs/DiagnosticReports",
  "Preferences",
  "Preferences/ByHost",
  "PreferencePanes",
  "Saved Application State",
  "Services",
  "WebKit",
];

const SYSTEM_LIBRARY_DIRS = [
  "/Library/Application Support",
  "/Library/Application Support/CrashReporter",
  "/Library/Caches",
  "/Library/Extensions",
  "/Library/Internet Plug-Ins",
  "/Library/LaunchAgents",
  "/Library/LaunchDaemons",
  "/Library/Logs",
  "/Library/Logs/DiagnosticReports",
  "/Library/Preferences",
  "/Library/PreferencePanes",
  "/Library/PrivilegedHelperTools",
];

const EXTRA_SEARCH_PATHS = [
  join(HOME, ".config"),
  "/private/var/db/receipts",
  "/private/tmp",
  "/usr/local/etc",
  "/usr/local/opt",
  "/usr/local/share",
];

const SKIP_DEEP_SEARCH = new Set([
  "accounts",
  "addressbook",
  "appletv",
  "assistant",
  "assistants",
  "audio",
  "autosave information",
  "biome",
  "calendars",
  "callservices",
  "cloudstorage",
  "colorpickers",
  "colors",
  "compositions",
  "contacts",
  "containermanager",
  "daemon containers",
  "datadeliveryservices",
  "developer",
  "donotdisturb",
  "favorites",
  "finance",
  "fontcollections",
  "fonts",
  "frontboard",
  "gamekit",
  "homekit",
  "identityservices",
  "input methods",
  "intents",
  "keychains",
  "keyboard layouts",
  "keyboardservices",
  "languagemodeling",
  "lockdownmode",
  "mail",
  "messages",
  "metadata",
  "mobile documents",
  "passes",
  "photos",
  "printers",
  "responsekit",
  "safari",
  "sharing",
  "shortcuts",
  "sounds",
  "spelling",
  "spotlight",
  "suggestions",
  "translation",
  "trial",
  "weather",
]);

function normalize(str: string): string {
  return str.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function readPlistKey(plistPath: string, key: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile("/usr/bin/defaults", ["read", plistPath, key], (err, stdout) => {
      if (err) return resolve(null);
      resolve(stdout.trim() || null);
    });
  });
}

async function getAppIdentifiers(appPath: string): Promise<AppIdentifiers> {
  const plistPath = join(appPath, "Contents", "Info.plist");
  if (!existsSync(plistPath)) {
    return { bundleId: null, bundleName: null, displayName: null, executableName: null };
  }

  const [bundleId, bundleName, displayName, executableName] = await Promise.all([
    readPlistKey(plistPath, "CFBundleIdentifier"),
    readPlistKey(plistPath, "CFBundleName"),
    readPlistKey(plistPath, "CFBundleDisplayName"),
    readPlistKey(plistPath, "CFBundleExecutable"),
  ]);

  return { bundleId, bundleName, displayName, executableName };
}

function getDirSize(dirPath: string): Promise<number> {
  return new Promise((resolve) => {
    execFile("/usr/bin/du", ["-sk", dirPath], (err, stdout) => {
      if (err) return resolve(0);
      resolve(parseInt(stdout.split("\t")[0] || "0") * 1024);
    });
  });
}

function buildSearchTerms(appName: string, identifiers: AppIdentifiers): string[] {
  const terms = new Set<string>();

  terms.add(normalize(appName));

  const nameStripped = appName.replace(/\s*\d+(\.\d+)*\s*$/, "");
  if (nameStripped !== appName) terms.add(normalize(nameStripped));

  if (identifiers.bundleId) {
    terms.add(normalize(identifiers.bundleId));

    const parts = identifiers.bundleId.split(".");
    if (parts.length >= 3) {
      terms.add(normalize(parts.slice(-2).join("")));
    }

    const baseBundleId = identifiers.bundleId.replace(
      /\.(helper|agent|daemon|service|xpc|launcher|updater|installer|uninstaller|login|extension|plugin|shipit)$/i,
      "",
    );
    if (baseBundleId !== identifiers.bundleId) terms.add(normalize(baseBundleId));
  }

  if (identifiers.bundleName) terms.add(normalize(identifiers.bundleName));
  if (identifiers.displayName) terms.add(normalize(identifiers.displayName));
  if (identifiers.executableName) terms.add(normalize(identifiers.executableName));

  return [...terms].filter((t) => t.length >= 3);
}

function extractVendorName(bundleId: string | null): string | null {
  if (!bundleId) return null;
  const parts = bundleId.split(".");
  if (parts.length < 3) return null;
  const vendor = parts[1];
  if (!vendor || vendor.length < 2) return null;
  return vendor.toLowerCase();
}

function matchesApp(entry: string, searchTerms: string[], bundleId: string | null): boolean {
  const entryNormalized = normalize(entry.replace(/\.plist$/, ""));

  if (entryNormalized.length < 3) return false;

  for (const term of searchTerms) {
    if (entryNormalized === term) return true;
    if (term.length >= 8 && entryNormalized.includes(term)) return true;
  }

  if (bundleId) {
    const bundleNorm = normalize(bundleId);
    if (entryNormalized.includes(bundleNorm)) return true;
  }

  return false;
}

function safeReaddir(dirPath: string): string[] {
  try {
    return readdirSync(dirPath);
  } catch {
    return [];
  }
}

function scanFlat(dirPath: string, searchTerms: string[], bundleId: string | null): string[] {
  if (!existsSync(dirPath)) return [];
  return safeReaddir(dirPath)
    .filter((entry) => matchesApp(entry, searchTerms, bundleId))
    .map((entry) => join(dirPath, entry));
}

function scanDeep(dirPath: string, searchTerms: string[], bundleId: string | null): string[] {
  if (!existsSync(dirPath)) return [];
  const results = scanFlat(dirPath, searchTerms, bundleId);

  for (const entry of safeReaddir(dirPath)) {
    if (SKIP_DEEP_SEARCH.has(entry.toLowerCase())) continue;

    const subPath = join(dirPath, entry);
    try {
      if (!statSync(subPath).isDirectory()) continue;
    } catch {
      continue;
    }

    const subMatches = safeReaddir(subPath)
      .filter((sub) => matchesApp(sub, searchTerms, bundleId))
      .map((sub) => join(subPath, sub));

    results.push(...subMatches);
  }

  return results;
}

async function scanContainersByBundleId(bundleId: string): Promise<string[]> {
  const containersDir = join(HOME, "Library", "Containers");
  if (!existsSync(containersDir)) return [];
  const results: string[] = [];

  for (const entry of safeReaddir(containersDir)) {
    if (/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(entry)) {
      const metadataPath = join(containersDir, entry, ".com.apple.containermanagerd.metadata.plist");
      if (!existsSync(metadataPath)) continue;
      const metaId = await readPlistKey(metadataPath, "MCMMetadataIdentifier");
      if (metaId && metaId === bundleId) {
        results.push(join(containersDir, entry));
      }
    }
  }

  return results;
}

async function findResidualFiles(appName: string, identifiers: AppIdentifiers): Promise<ResidualFile[]> {
  const residuals: ResidualFile[] = [];
  const foundPaths = new Set<string>();
  const searchTerms = buildSearchTerms(appName, identifiers);

  const addMatch = async (fullPath: string, location: string) => {
    if (foundPaths.has(fullPath)) return;
    foundPaths.add(fullPath);
    try {
      const size = await getDirSize(fullPath);
      residuals.push({ path: fullPath, size, location });
    } catch {
      /* empty */
    }
  };

  for (const dir of USER_LIBRARY_DIRS) {
    const libraryDir = join(HOME, "Library", dir);
    const matches = scanFlat(libraryDir, searchTerms, identifiers.bundleId);
    for (const match of matches) await addMatch(match, dir);
  }

  const deepScanDirs = [join(HOME, "Library"), "/Library"];
  for (const dir of deepScanDirs) {
    if (!existsSync(dir)) continue;
    const label = dir === "/Library" ? "System Library" : "Library";
    const matches = scanDeep(dir, searchTerms, identifiers.bundleId);
    for (const match of matches) {
      if (foundPaths.has(match)) continue;
      const parentName = basename(join(match, ".."));
      const locationLabel = parentName === basename(dir) ? label : `${label}/${parentName}`;
      await addMatch(match, locationLabel);
    }
  }

  for (const dir of SYSTEM_LIBRARY_DIRS) {
    if (!existsSync(dir)) continue;
    const matches = scanFlat(dir, searchTerms, identifiers.bundleId);
    const label = dir.replace("/Library/", "System ");
    for (const match of matches) await addMatch(match, label);
  }

  for (const dir of EXTRA_SEARCH_PATHS) {
    if (!existsSync(dir)) continue;
    const matches = scanFlat(dir, searchTerms, identifiers.bundleId);
    const label = dir.startsWith(HOME) ? dir.replace(HOME, "~") : dir;
    for (const match of matches) await addMatch(match, label);
  }

  if (identifiers.bundleId) {
    const vendorName = extractVendorName(identifiers.bundleId);
    if (vendorName) {
      const vendorSearchDirs = [
        join(HOME, "Library", "Application Support"),
        join(HOME, "Library", "Caches"),
        join(HOME, "Library", "Logs"),
        "/Library/Application Support",
        "/Library/Caches",
      ];
      for (const dir of vendorSearchDirs) {
        const vendorDir = join(dir, vendorName.charAt(0).toUpperCase() + vendorName.slice(1));
        if (!existsSync(vendorDir)) continue;
        const matches = scanFlat(vendorDir, searchTerms, identifiers.bundleId);
        const label = dir.startsWith("/Library") ? `System ${basename(dir)}` : basename(dir);
        for (const match of matches) await addMatch(match, `${label}/${basename(vendorDir)}`);
      }
    }

    const containerMatches = await scanContainersByBundleId(identifiers.bundleId);
    for (const match of containerMatches) await addMatch(match, "Containers");
  }

  return residuals.sort((a, b) => b.size - a.size);
}

function useInstalledApps() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const appDirs = ["/Applications", join(HOME, "Applications")];
    const found: AppInfo[] = [];

    for (const dir of appDirs) {
      try {
        const entries = readdirSync(dir);
        for (const entry of entries) {
          if (!entry.endsWith(".app")) continue;
          const fullPath = join(dir, entry);
          try {
            const stat = statSync(fullPath);
            found.push({
              name: entry.replace(/\.app$/, ""),
              path: fullPath,
              size: 0,
              lastModified: stat.mtime,
            });
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    found.sort((a, b) => a.name.localeCompare(b.name));
    setApps(found);
    setIsLoading(false);

    const calcSizes = async () => {
      const updated = await Promise.all(
        found.map(async (app) => {
          const size = await getDirSize(app.path);
          return { ...app, size };
        }),
      );
      updated.sort((a, b) => a.name.localeCompare(b.name));
      setApps(updated);
    };

    calcSizes();
  }, []);

  return { apps, isLoading };
}

export default function UninstallApp() {
  const molePath = useMemo(() => getMolePathSafe(), []);

  if (!molePath) {
    return (
      <List>
        <List.EmptyView
          title="Mole Not Installed"
          description="Install Mole to use this extension: brew install mole"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return <UninstallView />;
}

function UninstallView() {
  const { apps, isLoading } = useInstalledApps();
  const [removedPaths, setRemovedPaths] = useState<Set<string>>(new Set());

  async function handleUninstall(app: AppInfo) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Scanning ${app.name} residual files...` });

    const identifiers = await getAppIdentifiers(app.path);
    const residuals = await findResidualFiles(app.name, identifiers);
    const residualsTotalSize = residuals.reduce((sum, r) => sum + r.size, 0);

    toast.hide();

    const residualsMessage =
      residuals.length > 0
        ? `\n\nFound ${residuals.length} residual item${residuals.length > 1 ? "s" : ""} (${formatBytes(residualsTotalSize)}):\n${residuals.map((r) => `  - ${basename(r.path)} (${r.location})`).join("\n")}`
        : "\n\nNo residual files found.";

    const totalSize = app.size + residualsTotalSize;

    if (
      await confirmAlert({
        title: `Uninstall ${app.name}?`,
        message: `This will move ${app.name}.app and all related files to the Trash.${totalSize > 0 ? ` Total size: ${formatBytes(totalSize)}.` : ""}${residualsMessage}`,
        primaryAction: { title: "Uninstall & Clean Residuals", style: Alert.ActionStyle.Destructive },
      })
    ) {
      const progressToast = await showToast({ style: Toast.Style.Animated, title: `Removing ${app.name}...` });
      try {
        const allPaths = [app.path, ...residuals.map((r) => r.path)].filter((p) => existsSync(p));
        const failedPaths: string[] = [];

        for (const p of allPaths) {
          try {
            await trash(p);
          } catch {
            failedPaths.push(p);
          }
        }

        const removedCount = allPaths.length - failedPaths.length;
        if (!failedPaths.includes(app.path)) {
          setRemovedPaths((prev) => new Set([...prev, app.path]));
        }
        progressToast.style = Toast.Style.Success;
        progressToast.title = `${app.name} moved to Trash`;

        if (failedPaths.length > 0) {
          progressToast.message = `${removedCount} item${removedCount > 1 ? "s" : ""} removed, ${failedPaths.length} skipped (permission denied)`;
        } else {
          const residualsRemoved = removedCount - 1;
          progressToast.message =
            residualsRemoved > 0
              ? `App + ${residualsRemoved} residual item${residualsRemoved > 1 ? "s" : ""} moved to Trash`
              : undefined;
        }
      } catch (err) {
        await showFailureToast(err, { title: "Uninstall failed" });
      }
    }
  }

  const timeSince = (date: Date): string => {
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    if (days < 365) return `${Math.floor(days / 30)} months ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const visibleApps = apps.filter((app) => !removedPaths.has(app.path));

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search applications...">
      {visibleApps.map((app) => (
        <List.Item
          key={app.path}
          title={app.name}
          icon={{ fileIcon: app.path }}
          accessories={[
            ...(app.size > 0 ? [{ tag: formatBytes(app.size) }] : []),
            { text: timeSince(app.lastModified) },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Uninstall"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleUninstall(app)}
              />
              <Action.ShowInFinder path={app.path} />
              <Action.Open title="Open App" target={app.path} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
