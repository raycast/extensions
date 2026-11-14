import { getPreferenceValues, Cache } from "@raycast/api";
import { execa } from "execa";
import { MenuBarDetail } from "../types";

const menuBarDetailCache = new Cache({
  namespace: "menu-bar-details",
});

const CACHE_KEY_PREFIX = "menubar-";

type TimestampedCacheEntry<T> = {
  timestamp: number;
  data: T;
};

async function fetchAppPathByBundleId(bundleId: string): Promise<string | undefined> {
  try {
    const { stdout } = await execa("mdfind", ["kMDItemCFBundleIdentifier", "==", bundleId]);
    const paths = stdout.split("\n").filter(Boolean);
    return paths.length > 0 ? paths[0] : undefined;
  } catch (error) {
    console.error(`Error finding path for bundle ID ${bundleId}:`, error);
    return undefined;
  }
}

async function fetchBundleDisplayNameByAppPath(appPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await execa("mdls", ["-name", "kMDItemDisplayName", "-raw", appPath]);
    if (stdout.includes(": could not find")) {
      console.error(`Error fetching bundle name for path ${appPath}:`, stdout);
      return undefined;
    }
    if (stdout.trim() !== "(null)") {
      // The display name includes ".app" when Finder is set to show all filename extensions
      return stdout.trim().replace(/\.app$/, "");
    }
  } catch (error) {
    console.error("Error fetching bundle name from app path:", error);
  }
  // If mdls fails, just return undefined
  return undefined;
}

function fetchCacheExpirationFromPreferences(): number {
  const { cacheExpirationTime } = getPreferenceValues<Preferences>();

  switch (cacheExpirationTime) {
    case "hour":
      return 60 * 60 * 1000;
    case "day":
      return 24 * 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}

function createAppIcon(path: string): MenuBarDetail["icon"] {
  return {
    type: "app",
    path,
  };
}

function createAssetIcon(path: string): MenuBarDetail["icon"] {
  return {
    type: "asset",
    path,
  };
}

/**
 * Bartender 7 identifies items differently than Bartender 5 and 6:
 *   "plist:status:com.raycast.macos::Item-0"  (regular status item)
 *   "slot:eu.exelban.Stats:eu.exelban.Stats:1"  (item placed in a Bartender slot)
 *   "plist:module:WiFi"  (Apple's Control Center modules)
 * This converts them into the older style (e.g. "com.raycast.macos-Item-0", "com.apple.controlcenter-WiFi")
 * so the name and icon lookups below work for both.
 */
function normalizeMenuBarString(menuBarString: string): string {
  const statusMatch = menuBarString.match(/^plist:status:(.+?)::(.*)$/);
  if (statusMatch) {
    const [, bundleId, itemName] = statusMatch;
    if (bundleId === "com.apple.MenuBarAgent") {
      return itemName === "com.apple.menuextra.controlcenter"
        ? "com.apple.controlcenter-BentoBox"
        : `com.apple.controlcenter-${itemName.split(".").pop()}`;
    }
    return `${bundleId}-${itemName}`;
  }

  const moduleMatch = menuBarString.match(/^plist:module:(.+)$/);
  if (moduleMatch) {
    return `com.apple.controlcenter-${moduleMatch[1]}`;
  }

  const slotMatch = menuBarString.match(/^slot:([^:]+):/);
  if (slotMatch) {
    return slotMatch[1];
  }

  return menuBarString;
}

function resolveSpecialMenuBarDetail(menuBarString: string): MenuBarDetail | null {
  if (menuBarString === "com.apple.controlcenter-BentoBox") {
    return {
      name: "Control Center",
      menuBarId: menuBarString,
      icon: createAppIcon("/System/Library/ExtensionKit/Extensions/ControlCenterSettings.appex"),
    };
  }

  if (menuBarString === "com.apple.controlcenter-ScreenMirroring") {
    return {
      name: "Screen Mirroring",
      menuBarId: menuBarString,
      icon: createAssetIcon("screen-mirror-icon.png"),
    };
  }

  if (menuBarString.startsWith("com.apple.controlcenter-")) {
    return {
      name: menuBarString.substring("com.apple.controlcenter-".length),
      menuBarId: menuBarString,
      icon: menuBarString.includes("Clock")
        ? createAppIcon("/System/Library/CoreServices/Finder.app/Contents/Applications/Recents.app")
        : createAppIcon("/System/Library/CoreServices/ControlCenter.app"),
    };
  }

  if (menuBarString.startsWith("com.apple.systemuiserver-")) {
    return {
      name: menuBarString.substring("com.apple.systemuiserver-".length),
      menuBarId: menuBarString,
      icon: createAppIcon("/System/Library/CoreServices/Siri.app"),
    };
  }

  if (menuBarString === "com.apple.TextInputMenuAgent-Item-0") {
    return {
      name: "Keyboard Input Source",
      menuBarId: menuBarString,
      icon: createAppIcon("/System/Library/CoreServices/Setup Assistant.app"),
    };
  }

  return null;
}

async function resolveMenuBarDetailWithCache(menuBarString: string): Promise<MenuBarDetail> {
  const cacheKey = `${CACHE_KEY_PREFIX}${menuBarString}`;
  const now = Date.now();

  const cacheAndReturn = (data: MenuBarDetail): MenuBarDetail => {
    const timestampedEntry: TimestampedCacheEntry<MenuBarDetail> = {
      timestamp: now,
      data,
    };
    menuBarDetailCache.set(cacheKey, JSON.stringify(timestampedEntry));
    return data;
  };

  const cachedData = menuBarDetailCache.get(cacheKey);
  if (cachedData) {
    try {
      const expirationTime = fetchCacheExpirationFromPreferences();
      const timestampedEntry = JSON.parse(cachedData) as TimestampedCacheEntry<MenuBarDetail>;

      if (now - timestampedEntry.timestamp < expirationTime) {
        return timestampedEntry.data;
      }
    } catch (error) {
      console.error("Error parsing cached menu bar detail:", error);
    }
  }

  const lookupString = normalizeMenuBarString(menuBarString);

  const specialCase = resolveSpecialMenuBarDetail(lookupString);
  if (specialCase) {
    return cacheAndReturn({ ...specialCase, menuBarId: menuBarString });
  }

  // Try multiple iterations, working backwards from the full string
  // Example inputs: "com.sindresorhus.Dato-setapp-Dato", "org.pqrs.Karabiner-Menu-Item-0"
  let currentString = lookupString;

  while (currentString.length > 0) {
    const path = await fetchAppPathByBundleId(currentString);

    if (path) {
      // Found a valid path, get a friendly name from the app path
      const displayName = await fetchBundleDisplayNameByAppPath(path);

      const result = {
        name: displayName || path,
        menuBarId: menuBarString,
        icon: createAppIcon(path),
      };

      return cacheAndReturn(result);
    }

    // Move backwards by finding the last period or dash
    const lastPeriodIndex = currentString.lastIndexOf(".");
    const lastDashIndex = currentString.lastIndexOf("-");

    // Find the rightmost delimiter
    const lastDelimiterIndex = Math.max(lastPeriodIndex, lastDashIndex);

    // If no delimiter is found, break the loop
    if (lastDelimiterIndex === -1) {
      break;
    }

    // Trim the string up to the last delimiter
    currentString = currentString.substring(0, lastDelimiterIndex);
  }

  // No valid path was found
  const result = {
    menuBarId: menuBarString,
  };

  return cacheAndReturn(result);
}

export async function fetchAllMenuBarDetail(menuBarBundleIds: string[] | undefined) {
  if (!menuBarBundleIds) {
    return [];
  }

  return await Promise.all(
    menuBarBundleIds.filter((x) => x.trim().length > 0).map((x) => resolveMenuBarDetailWithCache(x)),
  );
}

export async function fetchMenuBarDetail(menuBarId: string): Promise<MenuBarDetail> {
  return await resolveMenuBarDetailWithCache(menuBarId);
}

export function clearMenuBarDetailCache(): void {
  menuBarDetailCache.clear();
}
