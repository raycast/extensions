import { closeMainWindow, open, PopToRootType, showToast, Toast } from "@raycast/api";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { resolve } from "path";

export const SNAPZY_DB = resolve(homedir(), "Library/Application Support/Snapzy/snapzy.db");
const SNAPZY_CONFIG = resolve(homedir(), ".config/snapzy/config.toml");
const SNAPZY_APP_PATHS = ["/Applications/Snapzy.app", resolve(homedir(), "Applications/Snapzy.app")];

type Params = Record<string, string | string[]>;

// String-built rather than new URL(): custom-scheme host/path handling varies.
export function snapzyUrl(route: string, params?: Params): string {
  let url = `snapzy://${route}`;
  if (params) {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(params)) {
      for (const v of Array.isArray(value) ? value : [value]) {
        parts.push(`${key}=${encodeURIComponent(v)}`);
      }
    }
    if (parts.length > 0) url += `?${parts.join("&")}`;
  }
  return url;
}

// Snapzy mirrors its settings to config.toml; a definite `false` here means every
// deep link is silently ignored, so surface it before doing anything else.
function urlSchemeDisabled(): boolean {
  try {
    // Allow a trailing inline TOML comment after the value.
    return /^\s*url_scheme_enabled\s*=\s*false\s*(#.*)?$/m.test(readFileSync(SNAPZY_CONFIG, "utf8"));
  } catch {
    return false;
  }
}

async function showOpenFailure(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't open Snapzy",
    message: "Is Snapzy installed? Get it at github.com/duongductrong/Snapzy.",
  });
}

// Close Raycast first so it's not in the shot; open() launches Snapzy if it isn't running.
// Returns false when the deep link was not delivered (caller may skip success feedback).
export async function openSnapzy(route: string, params?: Params): Promise<boolean> {
  if (urlSchemeDisabled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Snapzy's URL scheme is disabled",
      message: "Enable it in Snapzy Settings → General, then try again.",
    });
    return false;
  }
  const url = snapzyUrl(route, params);
  if (SNAPZY_APP_PATHS.some((path) => existsSync(path))) {
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    try {
      await open(url);
      return true;
    } catch {
      await showOpenFailure();
      return false;
    }
  }
  // No app bundle in the usual places: try the link before closing, so a failure keeps the
  // window and the user's search intact. An unusually-located install still works (at the
  // rare cost of Raycast possibly appearing in a fullscreen shot).
  try {
    await open(url);
  } catch {
    await showOpenFailure();
    return false;
  }
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
  return true;
}

// capturedAt/uploadedAt are UTC "YYYY-MM-DD HH:MM:SS.mmm"; null if the format ever drifts.
export function parseSnapzyDate(s: string): Date | null {
  const date = new Date(s.replace(" ", "T") + "Z");
  return isNaN(date.getTime()) ? null : date;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
