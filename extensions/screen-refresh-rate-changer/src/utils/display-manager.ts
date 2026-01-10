import { LocalStorage } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import { DisplayInfo, CachedDisplayData, CachedRefreshRates } from "./types";
import { debugLog } from "./debug";
import {
  GET_DISPLAYS_SCRIPT,
  getAvailableRefreshRatesScript,
  getCurrentRefreshRateScript,
  changeRefreshRateScript,
} from "./powershell-scripts";

// Cache duration in milliseconds (1 day)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

/**
 * Get all available displays with caching
 */
export async function getDisplays(): Promise<DisplayInfo[]> {
  debugLog("Getting displays...");

  // Try to get from cache first
  const cachedData = await LocalStorage.getItem<string>("cached_displays");
  if (cachedData) {
    try {
      const parsed: CachedDisplayData = JSON.parse(cachedData);
      const age = Date.now() - parsed.timestamp;

      if (age < CACHE_DURATION) {
        debugLog("Using cached display data", { age: `${Math.round(age / 1000)}s` });
        return parsed.displays;
      } else {
        debugLog("Cache expired", { age: `${Math.round(age / 1000)}s` });
      }
    } catch (error) {
      debugLog("Error parsing cached displays:", error);
    }
  }

  // Fetch fresh data
  debugLog("Fetching fresh display data...");
  try {
    const output = await runPowerShellScript(GET_DISPLAYS_SCRIPT, {
      timeout: 5000,
    });

    const displays = JSON.parse(output);
    const displayArray = Array.isArray(displays) ? displays : [displays];

    // Cache the result
    const cacheData: CachedDisplayData = {
      displays: displayArray,
      timestamp: Date.now(),
    };
    await LocalStorage.setItem("cached_displays", JSON.stringify(cacheData));
    debugLog("Cached display data");

    return displayArray;
  } catch (error) {
    debugLog("Error fetching displays:", error);
    throw error;
  }
}

/**
 * Get available refresh rates for a display with caching
 */
export async function getAvailableRefreshRates(displayIndex: number): Promise<number[]> {
  debugLog(`Getting available refresh rates for display ${displayIndex}`);

  // Try to get from cache first
  const cachedData = await LocalStorage.getItem<string>("cached_refresh_rates");
  if (cachedData) {
    try {
      const parsed: CachedRefreshRates = JSON.parse(cachedData);
      const displayCache = parsed[displayIndex.toString()];

      if (displayCache) {
        const age = Date.now() - displayCache.timestamp;

        if (age < CACHE_DURATION) {
          debugLog("Using cached refresh rates", { displayIndex, age: `${Math.round(age / 1000)}s` });
          return displayCache.rates;
        } else {
          debugLog("Refresh rate cache expired", { displayIndex, age: `${Math.round(age / 1000)}s` });
        }
      }
    } catch (error) {
      debugLog("Error parsing cached refresh rates:", error);
    }
  }

  // Fetch fresh data
  debugLog(`Fetching fresh refresh rates for display ${displayIndex}...`);
  try {
    const output = await runPowerShellScript(getAvailableRefreshRatesScript(displayIndex), {
      timeout: 8000,
    });

    const rates = JSON.parse(output);
    const ratesArray = Array.isArray(rates) ? rates : [rates];
    const validRates = ratesArray.filter((rate) => typeof rate === "number" && rate > 0);

    // Update cache
    const existingCache = await LocalStorage.getItem<string>("cached_refresh_rates");
    const allRates: CachedRefreshRates = existingCache ? JSON.parse(existingCache) : {};

    allRates[displayIndex.toString()] = {
      rates: validRates,
      timestamp: Date.now(),
    };

    await LocalStorage.setItem("cached_refresh_rates", JSON.stringify(allRates));
    debugLog("Cached refresh rates", { displayIndex, rates: validRates });

    return validRates.length > 0 ? validRates : [60];
  } catch (error) {
    debugLog("Error fetching refresh rates:", error);
    // Fallback to common rates if detection fails
    return [60, 75, 120, 144, 165, 240];
  }
}

/**
 * Get current refresh rate for a display (always fresh, not cached)
 */
export async function getCurrentRefreshRate(displayIndex: number): Promise<number> {
  debugLog(`Getting current refresh rate for display ${displayIndex}`);

  try {
    const output = await runPowerShellScript(getCurrentRefreshRateScript(displayIndex), {
      timeout: 3000,
    });

    const refreshRate = parseInt(output.trim(), 10);
    debugLog(`Current refresh rate for display ${displayIndex}:`, refreshRate);
    return refreshRate || 60;
  } catch (error) {
    debugLog("Error getting current refresh rate:", error);
    return 60;
  }
}

/**
 * Change the refresh rate for a display
 */
export async function changeRefreshRate(displayIndex: number, refreshRate: number): Promise<boolean> {
  debugLog(`Changing display ${displayIndex} to ${refreshRate}Hz`);

  try {
    const output = await runPowerShellScript(changeRefreshRateScript(displayIndex, refreshRate), {
      timeout: 5000,
    });

    debugLog("Change refresh rate output:", output);
    return output.trim() === "SUCCESS";
  } catch (error) {
    debugLog("Error changing refresh rate:", error);
    throw error;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  debugLog("Clearing all cached data...");
  await LocalStorage.removeItem("cached_displays");
  await LocalStorage.removeItem("cached_refresh_rates");
  debugLog("Cache cleared");
}
