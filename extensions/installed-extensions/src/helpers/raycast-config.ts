import { showToast, Toast, environment } from "@raycast/api";
import os from "os";
import path from "path";
import { isWindows } from "./utils";

const BUNDLE_ID_TO_CONFIG_DIR: Record<string, string> = {
  "com.raycast-x.macos.internal": "raycast-x-internal",
  "com.raycast-x.macos.development": "raycast-x-development",
  "com.raycast-x.macos.debug": "raycast-x-debug",
  "com.raycast-x.macos": "raycast-x",
  "com.raycast.macos.internal": "raycast-internal",
  "com.raycast.macos.debug": "raycast-debug",
  "com.raycast.macos": "raycast",
  "com.raycast-x.windows.internal": "raycast-x-internal",
  "com.raycast-x.windows": "raycast-x",
};

const BUNDLE_ID_MATCH_ORDER = Object.keys(BUNDLE_ID_TO_CONFIG_DIR).sort((a, b) => b.length - a.length);

const APPLICATION_SUPPORT_MARKERS = ["Application Support", "Roaming"] as const;

export function getBundleIdFromSupportPath(supportPath: string): string | null {
  const normalized = path.normalize(supportPath);
  const segments = normalized.split(path.sep);

  for (const marker of APPLICATION_SUPPORT_MARKERS) {
    const markerIndex = segments.indexOf(marker);
    if (markerIndex === -1 || markerIndex + 1 >= segments.length) {
      continue;
    }

    const candidate = segments[markerIndex + 1];
    if (candidate.startsWith("com.raycast")) {
      return candidate;
    }
  }

  const match = normalized.match(/com\.raycast[^\s/\\]+/);
  return match?.[0] ?? null;
}

export function getConfigDirNameFromBundleId(bundleId: string): string | undefined {
  for (const id of BUNDLE_ID_MATCH_ORDER) {
    if (bundleId === id) {
      return BUNDLE_ID_TO_CONFIG_DIR[id];
    }
  }

  return undefined;
}

function getDefaultConfigDirName(): string {
  return isWindows ? "raycast-x" : "raycast";
}

/**
 * Resolves the installed-extensions directory for the running Raycast build
 * (production, internal, debug, development) from environment.supportPath.
 */
export function getExtensionsDirectory(supportPath: string = environment.supportPath): string {
  const bundleId = getBundleIdFromSupportPath(supportPath);
  const configDirName = (bundleId && getConfigDirNameFromBundleId(bundleId)) || getDefaultConfigDirName();

  if (bundleId && !getConfigDirNameFromBundleId(bundleId)) {
    showToast({
      style: Toast.Style.Failure,
      title: "Unknown Raycast bundle id",
      message: `Unknown Raycast bundle id "${bundleId}" from supportPath; falling back to ~/.config/${configDirName}/extensions`,
    });
  }

  return path.join(os.homedir(), ".config", configDirName, "extensions");
}
