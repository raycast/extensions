import { showHUD, showToast, Toast, LocalStorage, getPreferenceValues } from "@raycast/api";
import {
  getDisplays,
  getActiveWindow,
  resizeActiveWindow,
  getDisplayForWindow,
  getDisplayKey,
  DisplayInfo,
  isStageManagerEnabled,
} from "./utils/window-manager";

interface Preferences {
  enableAutoResize: boolean;
  enableAutoCenter: boolean;
  defaultDisplaySizes?: string;
  excludedApps?: string;
  appSpecificSizes?: string;
}

export function getDefaultFavoriteSize(display: DisplayInfo, prefs?: Preferences) {
  const defaultMappingStr =
    prefs?.defaultDisplaySizes ||
    "14:1070x916, 15:1150x950, 17:1280x1024, 21:1440x900, 22:1600x900, 24:1238x988, 27:1920x1080, 32:2560x1440";

  const mappings: Record<number, { width: number; height: number }> = {};
  defaultMappingStr.split(",").forEach((item) => {
    const parts = item.split(":");
    if (parts.length === 2) {
      const diag = parseInt(parts[0].trim());
      const sizeParts = parts[1].trim().split("x");
      if (sizeParts.length === 2) {
        const w = parseInt(sizeParts[0]);
        const h = parseInt(sizeParts[1]);
        if (!isNaN(diag) && !isNaN(w) && !isNaN(h)) {
          mappings[diag] = { width: w, height: h };
        }
      }
    }
  });

  const diag = display.diagonal || 24;
  if (mappings[diag]) {
    return mappings[diag];
  }

  // Fallbacks if diagonal is not explicitly mapped
  if (diag <= 14 && mappings[14]) return mappings[14];
  if (diag === 24 && mappings[24]) return mappings[24];

  // General fallback: 70% width, 85% height of visible area
  return {
    width: Math.round(display.visibleWidth * 0.7),
    height: Math.round(display.visibleHeight * 0.85),
  };
}

export function getAppSpecificSize(
  appName: string,
  display: DisplayInfo,
  prefs?: Preferences,
  localAppSizes?: Record<string, { width: number; height: number }>,
): { width: number; height: number } | null {
  if (!appName) return null;
  const cleanApp = appName.trim().toLowerCase();
  const displayKey = getDisplayKey(display);
  const diag = display.diagonal || 24;

  // 1. Check local app-specific favorites from LocalStorage first
  if (localAppSizes) {
    const specificKey = `${cleanApp}_${displayKey}`;
    if (localAppSizes[specificKey]) {
      return localAppSizes[specificKey];
    }
    const diagKey = `${cleanApp}_${diag}`;
    if (localAppSizes[diagKey]) {
      return localAppSizes[diagKey];
    }
  }

  // 2. Check settings preferences mapping
  const appPrefStr = prefs?.appSpecificSizes;
  if (appPrefStr) {
    const items = appPrefStr.split(",");
    for (const item of items) {
      const parts = item.split(":");
      if (parts.length === 3) {
        const itemApp = parts[0].trim().toLowerCase();
        const itemDiag = parseInt(parts[1].trim());
        const sizeParts = parts[2].trim().split("x");
        if (itemApp === cleanApp && itemDiag === diag && sizeParts.length === 2) {
          const w = parseInt(sizeParts[0]);
          const h = parseInt(sizeParts[1]);
          if (!isNaN(w) && !isNaN(h)) {
            return { width: w, height: h };
          }
        }
      }
    }
  }

  return null;
}

export function isAppExcluded(appName: string, excludedPref: string | undefined, localExcluded: string[]): boolean {
  if (!appName) return false;
  const cleanApp = appName.trim().toLowerCase();

  const prefApps = excludedPref ? excludedPref.split(",").map((a) => a.trim().toLowerCase()) : [];
  const localApps = localExcluded.map((a) => a.trim().toLowerCase());

  return prefApps.includes(cleanApp) || localApps.includes(cleanApp);
}

export default async function main() {
  try {
    const prefs = getPreferenceValues<Preferences>();
    const [displays, activeWindow] = await Promise.all([getDisplays(), getActiveWindow()]);

    // Check exclusion
    const rawLocalExcluded = await LocalStorage.getItem<string>("excluded-apps");
    const localExcluded = rawLocalExcluded ? JSON.parse(rawLocalExcluded) : [];

    if (isAppExcluded(activeWindow.appName, prefs.excludedApps, localExcluded)) {
      await showHUD(`Skipped resizing for excluded app: ${activeWindow.appName}`);
      return;
    }

    const display = getDisplayForWindow(activeWindow, displays);
    const key = getDisplayKey(display);

    // Fetch global monitor favorites
    const rawFavs = await LocalStorage.getItem<string>("display-favorites");
    const favs = rawFavs ? JSON.parse(rawFavs) : {};

    // Fetch app-specific favorites
    const rawAppFavs = await LocalStorage.getItem<string>("app-specific-favorites");
    const appFavs = rawAppFavs ? JSON.parse(rawAppFavs) : {};

    // Check app-specific favorite, then fallback to global monitor favorite, then default favorites
    let favSize = getAppSpecificSize(activeWindow.appName, display, prefs, appFavs);
    if (!favSize) {
      favSize = favs[key];
    }
    if (!favSize) {
      favSize = getDefaultFavoriteSize(display, prefs);
    }

    // Save current window bounds to restore later if needed
    const prevWindowBounds = {
      x: activeWindow.x,
      y: activeWindow.y,
      width: activeWindow.width,
      height: activeWindow.height,
    };
    await LocalStorage.setItem("previous-window-bounds", JSON.stringify(prevWindowBounds));

    // Calculate new position
    const rawLocalAutoCenter = await LocalStorage.getItem<boolean>("local-enable-auto-center");
    const autoCenter = rawLocalAutoCenter !== undefined ? rawLocalAutoCenter : prefs.enableAutoCenter !== false;
    let newX = activeWindow.x;
    let newY = activeWindow.y;

    if (autoCenter) {
      const isStageEnabled = await isStageManagerEnabled();
      let visibleX = display.visibleX;
      let visibleWidth = display.visibleWidth;

      if (isStageEnabled) {
        // Offset visible area to the right to clear Stage Manager recent apps strip (68px)
        visibleX += 68;
        visibleWidth -= 68;
      }

      newX = visibleX + Math.round((visibleWidth - favSize.width) / 2);
      newY = display.visibleY + Math.round((display.visibleHeight - favSize.height) / 2);
    } else {
      // Keep position but clamp inside screen bounds to avoid overflow
      const minX = display.visibleX;
      const maxX = display.visibleX + display.visibleWidth - favSize.width;
      const minY = display.visibleY;
      const maxY = display.visibleY + display.visibleHeight - favSize.height;

      newX = Math.max(minX, Math.min(maxX, activeWindow.x));
      newY = Math.max(minY, Math.min(maxY, activeWindow.y));
    }

    // Resize active window
    await resizeActiveWindow(newX, newY, favSize.width, favSize.height);

    await showHUD(`Resized to ${favSize.width}×${favSize.height} on ${display.name}`);
  } catch (error: unknown) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to apply favorite size",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
