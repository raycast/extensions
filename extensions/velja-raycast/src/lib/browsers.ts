import { Icon, type Image } from "@raycast/api";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { BrowserIdentifier } from "./types";
import { DEFAULT_BROWSER_MARKER, PROMPT_MARKER, parseBrowserIdentifier } from "./velja";

const BROWSER_NAME_BY_BUNDLE_ID: Record<string, string> = {
  "com.apple.Safari": "Safari",
  "com.google.Chrome": "Chrome",
  "com.google.Chrome.beta": "Chrome Beta",
  "com.google.Chrome.canary": "Chrome Canary",
  "com.microsoft.edgemac": "Microsoft Edge",
  "com.microsoft.edgemac.Beta": "Microsoft Edge Beta",
  "com.microsoft.edgemac.Dev": "Microsoft Edge Dev",
  "org.mozilla.firefox": "Firefox",
  "org.mozilla.nightly": "Firefox Nightly",
  "org.mozilla.firefoxdeveloperedition": "Firefox Developer Edition",
  "com.brave.Browser": "Brave",
  "com.brave.Browser.beta": "Brave Beta",
  "com.brave.Browser.nightly": "Brave Nightly",
  "com.vivaldi.Vivaldi": "Vivaldi",
  "company.thebrowser.Browser": "Arc",
  "ai.perplexity.comet": "Comet",
  "net.imput.helium": "Helium",
  "com.kagi.kagimacOS": "Kagi Browser",
};

const appPathCache = new Map<string, string | null>();
const appNameCache = new Map<string, string | null>();
const profileNameCache = new Map<string, Map<string, string> | null>();

const CHROMIUM_LOCAL_STATE_PATHS_BY_BUNDLE_ID: Record<string, string[]> = {
  "com.microsoft.edgemac": ["Library/Application Support/Microsoft Edge/Local State"],
  "com.microsoft.edgemac.Beta": ["Library/Application Support/Microsoft Edge Beta/Local State"],
  "com.microsoft.edgemac.Dev": ["Library/Application Support/Microsoft Edge Dev/Local State"],
  "com.google.Chrome": ["Library/Application Support/Google/Chrome/Local State"],
  "com.google.Chrome.beta": ["Library/Application Support/Google/Chrome Beta/Local State"],
  "com.google.Chrome.canary": ["Library/Application Support/Google/Chrome Canary/Local State"],
  "com.brave.Browser": ["Library/Application Support/BraveSoftware/Brave-Browser/Local State"],
  "com.brave.Browser.beta": ["Library/Application Support/BraveSoftware/Brave-Browser-Beta/Local State"],
  "com.brave.Browser.nightly": ["Library/Application Support/BraveSoftware/Brave-Browser-Nightly/Local State"],
  "ai.perplexity.comet": [
    "Library/Application Support/Comet/Local State",
    "Library/Application Support/Perplexity Comet/Local State",
  ],
  "company.thebrowser.Browser": ["Library/Application Support/Arc/User Data/Local State"],
};

function humanizeBundleId(bundleId: string): string {
  const leaf = bundleId.split(".").at(-1) ?? bundleId;
  const withSpaces = leaf.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return withSpaces.replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveInstalledAppPath(bundleId: string): string | undefined {
  if (appPathCache.has(bundleId)) {
    return appPathCache.get(bundleId) ?? undefined;
  }

  if (!bundleId) {
    appPathCache.set(bundleId, null);
    return undefined;
  }

  const query = `kMDItemCFBundleIdentifier == "${bundleId}"`;
  const result = spawnSync("mdfind", [query], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
  });

  if (result.status !== 0) {
    appPathCache.set(bundleId, null);
    return undefined;
  }

  const appPath = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.endsWith(".app"));

  if (!appPath) {
    appPathCache.set(bundleId, null);
    return undefined;
  }

  appPathCache.set(bundleId, appPath);
  return appPath;
}

function resolveInstalledBrowserName(bundleId: string): string | undefined {
  if (appNameCache.has(bundleId)) {
    return appNameCache.get(bundleId) ?? undefined;
  }

  const appPath = resolveInstalledAppPath(bundleId);
  if (!appPath) {
    appNameCache.set(bundleId, null);
    return undefined;
  }

  const appName = basename(appPath, ".app");
  appNameCache.set(bundleId, appName);
  return appName;
}

function resolveProfileName(bundleId: string, profileId: string): string | undefined {
  if (profileNameCache.has(bundleId)) {
    return profileNameCache.get(bundleId)?.get(profileId);
  }

  const localStateCandidates = CHROMIUM_LOCAL_STATE_PATHS_BY_BUNDLE_ID[bundleId];
  if (!localStateCandidates) {
    profileNameCache.set(bundleId, null);
    return undefined;
  }

  const localStatePath = localStateCandidates
    .map((relativePath) => join(homedir(), relativePath))
    .find((candidatePath) => existsSync(candidatePath));

  if (!localStatePath) {
    profileNameCache.set(bundleId, null);
    return undefined;
  }

  try {
    const raw = readFileSync(localStatePath, "utf8");
    const parsed = JSON.parse(raw) as { profile?: { info_cache?: Record<string, { name?: unknown }> } };
    const infoCache = parsed.profile?.info_cache;

    if (!infoCache || typeof infoCache !== "object") {
      profileNameCache.set(bundleId, null);
      return undefined;
    }

    const profileNames = new Map<string, string>();
    for (const [candidateProfileId, profileInfo] of Object.entries(infoCache)) {
      if (!profileInfo || typeof profileInfo !== "object") {
        continue;
      }

      const profileName = profileInfo.name;
      if (typeof profileName === "string" && profileName.trim().length > 0) {
        profileNames.set(candidateProfileId, profileName.trim());
      }
    }

    profileNameCache.set(bundleId, profileNames.size > 0 ? profileNames : null);
    return profileNames.get(profileId);
  } catch {
    profileNameCache.set(bundleId, null);
    return undefined;
  }
}

export function getBrowserName(bundleId: string): string {
  const installedName = resolveInstalledBrowserName(bundleId);
  if (installedName) {
    return installedName;
  }

  return BROWSER_NAME_BY_BUNDLE_ID[bundleId] ?? humanizeBundleId(bundleId);
}

export function getBrowserIcon(identifier: string): Image.ImageLike {
  if (!identifier || identifier === PROMPT_MARKER || identifier === DEFAULT_BROWSER_MARKER) {
    return Icon.Globe;
  }

  const parsed = parseBrowserIdentifier(identifier);
  const appPath = resolveInstalledAppPath(parsed.bundleId);
  return appPath ? { fileIcon: appPath } : Icon.Globe;
}

export function getBrowserSubtitle(identifier: string): string {
  if (identifier === PROMPT_MARKER) {
    return "Show browser prompt";
  }

  if (identifier === DEFAULT_BROWSER_MARKER) {
    return "System default browser";
  }

  const parsed = parseBrowserIdentifier(identifier);
  if (!parsed.profile) {
    return "No profile";
  }

  const profileName = resolveProfileName(parsed.bundleId, parsed.profile);
  return profileName && profileName !== parsed.profile ? `Stored as: ${parsed.profile}` : `Profile: ${parsed.profile}`;
}

export function getBrowserTitle(identifier: string): string {
  if (identifier === PROMPT_MARKER) {
    return "Prompt";
  }

  if (identifier === DEFAULT_BROWSER_MARKER) {
    return "System Default Browser";
  }

  const parsed = parseBrowserIdentifier(identifier);
  const browserName = getBrowserName(parsed.bundleId);
  if (!parsed.profile) {
    return browserName;
  }

  const profileName = resolveProfileName(parsed.bundleId, parsed.profile) ?? parsed.profile;
  return `${browserName} (${profileName})`;
}

export function parseIdentifier(identifier: string): BrowserIdentifier {
  return parseBrowserIdentifier(identifier);
}

export function getSelectableBrowserIdentifiers(
  preferredBrowsers: string[],
  options?: {
    includePrompt?: boolean;
    includeSystemDefault?: boolean;
    promptFirst?: boolean;
    extraIdentifiers?: string[];
  },
): string[] {
  const includePrompt = options?.includePrompt ?? false;
  const includeSystemDefault = options?.includeSystemDefault ?? false;
  const promptFirst = options?.promptFirst ?? false;
  const extraIdentifiers = options?.extraIdentifiers ?? [];
  const orderedIdentifiers: string[] = [];

  function addIdentifier(identifier?: string) {
    if (!identifier || orderedIdentifiers.includes(identifier)) {
      return;
    }

    orderedIdentifiers.push(identifier);
  }

  if (promptFirst && includePrompt) {
    addIdentifier(PROMPT_MARKER);
  }

  preferredBrowsers.forEach((identifier) => addIdentifier(identifier));
  extraIdentifiers.forEach((identifier) => addIdentifier(identifier));

  if (!promptFirst && includePrompt) {
    addIdentifier(PROMPT_MARKER);
  }

  if (includeSystemDefault) {
    addIdentifier(DEFAULT_BROWSER_MARKER);
  }

  return orderedIdentifiers;
}
