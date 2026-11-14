import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  MODERN_SETTINGS_SECURITY_URL,
  LEGACY_PREFERENCES_SECURITY_URL,
  LEGACY_PREFERENCES_FALLBACK_URL,
  SYSTEM_SETTINGS_BUNDLE_ID,
} from "./constants";

const execFileAsync = promisify(execFile);

export type UrlOpener = (urlOrTarget: string) => Promise<void>;

export interface NavigationOptions {
  opener?: UrlOpener;
}

export interface NavigationResult {
  success: boolean;
  openedTarget?: string;
  method?: "modern_url" | "legacy_url" | "legacy_fallback_url" | "bundle_id";
  error?: string;
}

/**
 * Default opener that leverages Raycast's open() API if running in Raycast runtime,
 * otherwise falling back to macOS /usr/bin/open.
 */
async function defaultOpener(target: string): Promise<void> {
  try {
    const raycastApi = await import("@raycast/api");
    if (typeof raycastApi.open === "function") {
      await raycastApi.open(target);
      return;
    }
  } catch {
    // In standalone or test environments, @raycast/api runtime is not present
  }

  await execFileAsync("open", [target]);
}

/**
 * Opens macOS Privacy & Security in System Settings.
 *
 * Sequence:
 * 1. Primary: Modern ExtensionKit deep link (macOS 13+ Ventura, Sonoma, Sequoia, etc.):
 *    "x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension"
 * 2. Fallback 1: Legacy preference pane URL with Privacy anchor:
 *    "x-apple.systempreferences:com.apple.preference.security?Privacy"
 * 3. Fallback 2: General Security preference pane URL:
 *    "x-apple.systempreferences:com.apple.preference.security"
 * 4. Fallback 3: Launch System Settings application directly by bundle identifier:
 *    "com.apple.systempreferences"
 */
export async function openPrivacySecuritySettings(options: NavigationOptions = {}): Promise<NavigationResult> {
  const opener = options.opener ?? defaultOpener;

  // 1. Try modern System Settings URL scheme
  try {
    await opener(MODERN_SETTINGS_SECURITY_URL);
    return {
      success: true,
      openedTarget: MODERN_SETTINGS_SECURITY_URL,
      method: "modern_url",
    };
  } catch (modernErr) {
    // Modern URL scheme failed, attempt legacy URLs
    try {
      await opener(LEGACY_PREFERENCES_SECURITY_URL);
      return {
        success: true,
        openedTarget: LEGACY_PREFERENCES_SECURITY_URL,
        method: "legacy_url",
      };
    } catch {
      try {
        await opener(LEGACY_PREFERENCES_FALLBACK_URL);
        return {
          success: true,
          openedTarget: LEGACY_PREFERENCES_FALLBACK_URL,
          method: "legacy_fallback_url",
        };
      } catch {
        // Fallback to opening System Settings application by bundle identifier
        try {
          await execFileAsync("open", ["-b", SYSTEM_SETTINGS_BUNDLE_ID]);
          return {
            success: true,
            openedTarget: SYSTEM_SETTINGS_BUNDLE_ID,
            method: "bundle_id",
          };
        } catch (bundleErr) {
          const errorMessage =
            bundleErr instanceof Error
              ? bundleErr.message
              : modernErr instanceof Error
                ? modernErr.message
                : "Failed to open System Settings.";
          return {
            success: false,
            error: errorMessage,
          };
        }
      }
    }
  }
}
