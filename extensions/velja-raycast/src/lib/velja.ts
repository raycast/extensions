import { execSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { BrowserIdentifier, VeljaConfig, VeljaRule, VeljaStatusSnapshot } from "./types";

export const VELJA_APP_PATH = "/Applications/Velja.app";
export const VELJA_BUNDLE_ID = "com.sindresorhus.Velja";
export const PROMPT_MARKER = "com.sindresorhus.Velja.promptMarker";
export const DEFAULT_BROWSER_MARKER = "com.sindresorhus.Velja.defaultBrowserMarker";

interface VeljaDefaultsPayload {
  defaultBrowser?: string;
  alternativeBrowser?: string;
  preferredBrowsers?: string[];
  rules?: string[];
}

export function isVeljaInstalled(): boolean {
  return existsSync(VELJA_APP_PATH);
}

export function isVeljaRunning(): boolean {
  const result = spawnSync("pgrep", ["-x", "Velja"], { encoding: "utf8" });
  return result.status === 0;
}

export function getVeljaVersion(): string | undefined {
  if (!isVeljaInstalled()) {
    return undefined;
  }

  try {
    return execSync(`defaults read "${VELJA_APP_PATH}/Contents/Info.plist" CFBundleShortVersionString`, {
      encoding: "utf8",
    }).trim();
  } catch {
    return undefined;
  }
}

export function parseBrowserIdentifier(identifier: string): BrowserIdentifier {
  const [bundleId, ...profileParts] = identifier.split("|");
  return {
    bundleId,
    profile: profileParts.length > 0 ? profileParts.join("|") : undefined,
  };
}

export function formatBrowserIdentifier(identifier?: string): string {
  if (!identifier) {
    return "Not configured";
  }

  if (identifier === PROMPT_MARKER) {
    return "Prompt";
  }

  if (identifier === DEFAULT_BROWSER_MARKER) {
    return "System Default Browser";
  }

  const parsed = parseBrowserIdentifier(identifier);
  return parsed.profile ? `${parsed.bundleId} (${parsed.profile})` : parsed.bundleId;
}

function readVeljaDefaultsPayload(): VeljaDefaultsPayload {
  function readStringKey(key: "defaultBrowser" | "alternativeBrowser"): string | undefined {
    try {
      const value = execSync(`defaults export ${VELJA_BUNDLE_ID} - | plutil -extract ${key} raw -o - -`, {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 8,
      }).trim();

      return value.length > 0 ? value : undefined;
    } catch {
      return undefined;
    }
  }

  function readStringArrayKey(key: "preferredBrowsers" | "rules"): string[] {
    try {
      const rawJson = execSync(`defaults export ${VELJA_BUNDLE_ID} - | plutil -extract ${key} json -o - -`, {
        encoding: "utf8",
        maxBuffer: 1024 * 1024 * 8,
      });
      const parsed = JSON.parse(rawJson) as unknown;

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [];
    }
  }

  return {
    defaultBrowser: readStringKey("defaultBrowser"),
    alternativeBrowser: readStringKey("alternativeBrowser"),
    preferredBrowsers: readStringArrayKey("preferredBrowsers"),
    rules: readStringArrayKey("rules"),
  };
}

function parseRules(rawRules: string[] | undefined): VeljaRule[] {
  if (!rawRules) {
    return [];
  }

  return rawRules.map((rule) => JSON.parse(rule) as VeljaRule);
}

export function readVeljaConfig(): VeljaConfig {
  const payload = readVeljaDefaultsPayload();

  return {
    defaultBrowser: payload.defaultBrowser,
    alternativeBrowser: payload.alternativeBrowser,
    preferredBrowsers: payload.preferredBrowsers ?? [],
    rules: parseRules(payload.rules),
  };
}

export function writeVeljaBrowserPreference(key: "defaultBrowser" | "alternativeBrowser", value: string): void {
  const result = spawnSync("defaults", ["write", VELJA_BUNDLE_ID, key, "-string", value], { encoding: "utf8" });

  if (result.status !== 0) {
    const error = result.stderr.trim() || `Failed to update ${key}`;
    throw new Error(error);
  }
}

export function getVeljaStatusSnapshot(): VeljaStatusSnapshot {
  const installed = isVeljaInstalled();
  const running = isVeljaRunning();
  const version = getVeljaVersion();

  if (!installed) {
    return {
      installed: false,
      running: false,
      version,
    };
  }

  try {
    const config = readVeljaConfig();
    return {
      installed,
      running,
      version,
      config,
    };
  } catch (error) {
    return {
      installed,
      running,
      version,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
