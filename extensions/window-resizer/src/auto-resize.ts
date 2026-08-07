import { getPreferenceValues, LocalStorage } from "@raycast/api";
import {
  getDisplays,
  getActiveWindow,
  resizeActiveWindow,
  getDisplayForWindow,
  getDisplayKey,
  isStageManagerEnabled,
} from "./utils/window-manager";
import { getDefaultFavoriteSize, isAppExcluded, getAppSpecificSize } from "./apply-favorite-size";

interface Preferences {
  enableAutoResize: boolean;
  enableAutoCenter: boolean;
  defaultDisplaySizes?: string;
  excludedApps?: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const rawLocalAutoResize = await LocalStorage.getItem<boolean>("local-enable-auto-resize");
  const autoResizeEnabled = rawLocalAutoResize !== undefined ? rawLocalAutoResize : preferences.enableAutoResize;
  if (!autoResizeEnabled) {
    return;
  }

  // Run a polling loop for 55 seconds, checking every 2 seconds
  const startTime = Date.now();
  const DURATION = 55000; // 55 seconds
  const INTERVAL = 2000; // 2 seconds

  let lastWindowApp = "";
  let lastWindowTitle = "";
  let lastDisplayKey = "";

  // Load last seen state from LocalStorage to resume
  const storedLastApp = await LocalStorage.getItem<string>("auto-last-app");
  const storedLastTitle = await LocalStorage.getItem<string>("auto-last-title");
  const storedLastDisplay = await LocalStorage.getItem<string>("auto-last-display");

  if (storedLastApp) lastWindowApp = storedLastApp;
  if (storedLastTitle) lastWindowTitle = storedLastTitle;
  if (storedLastDisplay) lastDisplayKey = storedLastDisplay;

  return new Promise<void>((resolve) => {
    const timer = setInterval(async () => {
      if (Date.now() - startTime >= DURATION) {
        clearInterval(timer);
        resolve();
        return;
      }

      try {
        const [displays, activeWindow] = await Promise.all([getDisplays(), getActiveWindow()]);

        // Check if application is excluded
        const rawLocalExcluded = await LocalStorage.getItem<string>("excluded-apps");
        const localExcluded = rawLocalExcluded ? JSON.parse(rawLocalExcluded) : [];

        if (isAppExcluded(activeWindow.appName, preferences.excludedApps, localExcluded)) {
          lastWindowApp = activeWindow.appName;
          lastWindowTitle = activeWindow.title;
          return; // Skip this execution tick
        }

        const currentDisplay = getDisplayForWindow(activeWindow, displays);
        const currentDisplayKey = getDisplayKey(currentDisplay);

        // Check if window changed OR display changed
        const isNewWindow = activeWindow.appName !== lastWindowApp || activeWindow.title !== lastWindowTitle;
        const isNewDisplay = currentDisplayKey !== lastDisplayKey;

        if (isNewWindow || isNewDisplay) {
          // Window has changed or moved to a new display!
          // We should auto-resize it to the favorite size for the target display.
          const rawFavs = await LocalStorage.getItem<string>("display-favorites");
          const favs = rawFavs ? JSON.parse(rawFavs) : {};

          const rawAppFavs = await LocalStorage.getItem<string>("app-specific-favorites");
          const appFavs = rawAppFavs ? JSON.parse(rawAppFavs) : {};

          // Look up app-specific favorite first, then global monitor favorite, then defaults
          let favSize = getAppSpecificSize(activeWindow.appName, currentDisplay, preferences, appFavs);
          if (!favSize) {
            favSize = favs[currentDisplayKey];
          }
          if (!favSize) {
            favSize = getDefaultFavoriteSize(currentDisplay, preferences);
          }

          // Check if it already matches the favorite size to avoid redundant resizes
          const isCorrectSize = activeWindow.width === favSize.width && activeWindow.height === favSize.height;

          if (!isCorrectSize) {
            const rawLocalAutoCenter = await LocalStorage.getItem<boolean>("local-enable-auto-center");
            const autoCenter =
              rawLocalAutoCenter !== undefined ? rawLocalAutoCenter : preferences.enableAutoCenter !== false;
            let newX = activeWindow.x;
            let newY = activeWindow.y;

            if (autoCenter) {
              const isStageEnabled = await isStageManagerEnabled();
              let visibleX = currentDisplay.visibleX;
              let visibleWidth = currentDisplay.visibleWidth;

              if (isStageEnabled) {
                // Offset visible area to the right by 68px to clear the Stage Manager apps bar
                visibleX += 68;
                visibleWidth -= 68;
              }

              newX = visibleX + Math.round((visibleWidth - favSize.width) / 2);
              newY = currentDisplay.visibleY + Math.round((currentDisplay.visibleHeight - favSize.height) / 2);
            } else {
              // Keep original top-left position but clamp within bounds to ensure screen containment
              const minX = currentDisplay.visibleX;
              const maxX = currentDisplay.visibleX + currentDisplay.visibleWidth - favSize.width;
              const minY = currentDisplay.visibleY;
              const maxY = currentDisplay.visibleY + currentDisplay.visibleHeight - favSize.height;

              newX = Math.max(minX, Math.min(maxX, activeWindow.x));
              newY = Math.max(minY, Math.min(maxY, activeWindow.y));
            }

            await resizeActiveWindow(newX, newY, favSize.width, favSize.height);
          }

          // Update last state
          lastWindowApp = activeWindow.appName;
          lastWindowTitle = activeWindow.title;
          lastDisplayKey = currentDisplayKey;

          await Promise.all([
            LocalStorage.setItem("auto-last-app", lastWindowApp),
            LocalStorage.setItem("auto-last-title", lastWindowTitle),
            LocalStorage.setItem("auto-last-display", lastDisplayKey),
          ]);
        }
      } catch (error) {
        // Silent error in background to avoid spamming the user
        console.error("Auto-resize check error:", error);
      }
    }, INTERVAL);
  });
}
