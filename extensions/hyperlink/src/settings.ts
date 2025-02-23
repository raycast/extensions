import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<{
  enableDebug?: boolean;
  allowSafari: boolean;
  allowChrome: boolean;
  allowFirefox: boolean;
  allowEdge: boolean;
  allowBrave: boolean;
  allowVivaldi: boolean;
  allowArc: boolean;
  allowOpera: boolean;
  allowZen: boolean;
  customBrowser?: { name: string };
}>();

export const DEBUG_MODE = Boolean(preferences.enableDebug);

export const ALLOWED_BROWSERS = [
  preferences.allowSafari ? "Safari" : null,
  preferences.allowChrome ? "Google Chrome" : null,
  preferences.allowFirefox ? "Firefox" : null,
  preferences.allowEdge ? "Microsoft Edge" : null,
  preferences.allowBrave ? "Brave Browser" : null,
  preferences.allowVivaldi ? "Vivaldi" : null,
  preferences.allowArc ? "Arc Browser" : null,
  preferences.allowOpera ? "Opera" : null,
  preferences.allowZen ? "Zen Browser" : null,
  preferences.customBrowser?.name ? preferences.customBrowser.name : null,
].filter(Boolean) as string[];

if (DEBUG_MODE) console.log("🧐 DEBUG: Allowed Browsers:", ALLOWED_BROWSERS);

export function isBrowserAllowed(browser: string | null): boolean {
  if (!browser) return false;

  if (ALLOWED_BROWSERS.includes(browser)) return true;

  if (
    preferences.customBrowser?.name &&
    preferences.customBrowser.name === browser
  ) {
    if (DEBUG_MODE)
      console.log(`✅ DEBUG: Custom browser ${browser} is allowed!`);
    return true;
  }

  return false;
}
