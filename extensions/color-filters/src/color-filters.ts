import { showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

// Filter type enum matching macOS MediaAccessibility framework
export enum ColorFilterType {
  Grayscale = 0,
  Protanopia = 1, // Red/Green
  Deuteranopia = 2, // Green/Red
  Tritanopia = 3, // Blue/Yellow
  ColorTint = 4,
}

export const filterNames: Record<ColorFilterType, string> = {
  [ColorFilterType.Grayscale]: "Grayscale",
  [ColorFilterType.Protanopia]: "Protanopia (Red/Green)",
  [ColorFilterType.Deuteranopia]: "Deuteranopia (Green/Red)",
  [ColorFilterType.Tritanopia]: "Tritanopia (Blue/Yellow)",
  [ColorFilterType.ColorTint]: "Color Tint",
};

// Map to macOS menu item names
const filterMenuItems: Record<ColorFilterType, string> = {
  [ColorFilterType.Grayscale]: "Grayscale",
  [ColorFilterType.Protanopia]: "Red/Green filter (Protanopia)",
  [ColorFilterType.Deuteranopia]: "Green/Red filter (Deuteranopia)",
  [ColorFilterType.Tritanopia]: "Blue/Yellow filter (Tritanopia)",
  [ColorFilterType.ColorTint]: "Color Tint",
};

const PREF_DOMAIN = "com.apple.mediaaccessibility";
const PREF_ENABLED = "MADisplayFilterCategoryEnabled";
const PREF_TYPE = "MADisplayFilterType";

// Exact UI element path for macOS Tahoe (26.x)
// ⚠️ IMPORTANT: These paths are version-specific and may break with macOS updates
// If this extension stops working after a macOS update:
// 1. Open: open 'x-apple.systempreferences:com.apple.preference.universalaccess?Seeing_Display'
// 2. Run: osascript -e 'tell application "System Events" to tell process "System Settings" to get entire contents of window 1'
// 3. Search the output for "Color Filters" checkbox and popup button
// 4. Update the paths below with the new hierarchy
const CHECKBOX_PATH =
  "checkbox 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1";
const POPUP_PATH =
  "pop up button 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1";

/**
 * Get current color filter status from preferences
 */
function getFilterEnabled(): boolean {
  try {
    const result = execSync(`defaults read ${PREF_DOMAIN} ${PREF_ENABLED}`, {
      encoding: "utf-8",
      timeout: 2000,
    });
    return result.trim() === "1";
  } catch {
    return false;
  }
}

/**
 * Get current filter type from preferences
 */
function getFilterType(): ColorFilterType {
  try {
    const result = execSync(`defaults read ${PREF_DOMAIN} ${PREF_TYPE}`, {
      encoding: "utf-8",
      timeout: 2000,
    });
    return parseInt(result.trim(), 10) as ColorFilterType;
  } catch {
    return ColorFilterType.Grayscale;
  }
}

/**
 * Toggle color filters using exact UI element path
 * Based on proven approach from toggle-grayscale extension
 *
 * Working config (baseline): delay 0.2 → 0.1 → 0.1 (polling: 0.1)
 * Current config: delay 0.1 → 0.05 (polling: 0.05)
 */
async function toggleColorFiltersViaUI(): Promise<boolean> {
  const script = `
    -- Open Accessibility > Display (navigates to correct pane whether running or not)
    do shell script "open 'x-apple.systempreferences:com.apple.preference.universalaccess?Seeing_Display'"

    tell application "System Events"
      tell process "System Settings"
        repeat until (exists window 1)
          delay 0.05
        end repeat

        delay 0.1

        -- Click the Color Filters checkbox (exact path)
        click ${CHECKBOX_PATH}

        -- Send window to background
        set visible to false
      end tell
    end tell
  `;

  try {
    execSync("osascript", {
      input: script,
      encoding: "utf-8",
      timeout: 5000,
    });
    return true;
  } catch (error) {
    console.error("Toggle error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to toggle: ${message}`);
  }
}

/**
 * Set filter type using exact UI element path
 * Enables checkbox if needed, then selects filter from popup
 *
 * Working config (baseline): delay 0.2 → 0.1 → 0.1 → 0.1
 * Current config: delay 0.1 → 0.05 → 0.05 → 0.05 (experimental)
 */
async function setFilterTypeViaUI(filterType: ColorFilterType): Promise<void> {
  const filterName = filterMenuItems[filterType];

  const script = `
    -- Open Accessibility > Display (navigates to correct pane whether running or not)
    do shell script "open 'x-apple.systempreferences:com.apple.preference.universalaccess?Seeing_Display'"

    tell application "System Events"
      tell process "System Settings"
        repeat until (exists window 1)
          delay 0.05
        end repeat

        delay 0.1

        -- Enable checkbox if not already enabled
        set checkboxPath to ${CHECKBOX_PATH}
        set checkboxValue to value of checkboxPath
        if checkboxValue is 0 then
          click checkboxPath
          delay 0.05
        end if

        -- Click popup button and select filter
        set popupPath to ${POPUP_PATH}
        click popupPath
        delay 0.05
        click menu item "${filterName}" of menu 1 of popupPath

        -- Send window to background
        set visible to false
      end tell
    end tell
  `;

  try {
    execSync("osascript", {
      input: script,
      encoding: "utf-8",
      timeout: 5000,
    });
  } catch (error) {
    console.error("Set filter error:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to set filter: ${message}`);
  }
}

async function runColorFilterAction(
  action: "toggle" | "enable" | "disable" | "setType" | "getStatus",
  filterType?: ColorFilterType,
): Promise<string> {
  switch (action) {
    case "toggle": {
      await toggleColorFiltersViaUI();
      // Wait for preferences to be written to disk
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const isEnabled = getFilterEnabled();
      return isEnabled ? "enabled" : "disabled";
    }

    case "enable": {
      const isEnabled = getFilterEnabled();
      if (!isEnabled) {
        await toggleColorFiltersViaUI();
      }
      return "enabled";
    }

    case "disable": {
      const isEnabled = getFilterEnabled();
      if (isEnabled) {
        await toggleColorFiltersViaUI();
      }
      return "disabled";
    }

    case "setType":
      if (filterType === undefined) {
        throw new Error("Filter type is required for setType action");
      }
      await setFilterTypeViaUI(filterType);
      return "set";

    case "getStatus": {
      const enabled = getFilterEnabled();
      const type = getFilterType();
      return `${enabled ? 1 : 0},${type}`;
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

export async function toggleColorFilters(): Promise<void> {
  try {
    const result = await runColorFilterAction("toggle");
    const isEnabled = result === "enabled";
    await showHUD(`Color Filters ${isEnabled ? "Enabled" : "Disabled"}`);
  } catch (error) {
    console.error("Error toggling color filters:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to toggle color filters",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function enableColorFilters(): Promise<void> {
  try {
    await runColorFilterAction("enable");
    await showHUD("Color Filters Enabled");
  } catch (error) {
    console.error("Error enabling color filters:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to enable color filters",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function disableColorFilters(): Promise<void> {
  try {
    await runColorFilterAction("disable");
    await showHUD("Color Filters Disabled");
  } catch (error) {
    console.error("Error disabling color filters:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to disable color filters",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function setColorFilterType(
  filterType: ColorFilterType,
): Promise<void> {
  try {
    await runColorFilterAction("setType", filterType);
    await showHUD(`${filterNames[filterType]} Filter Enabled`);
  } catch (error) {
    console.error("Error setting color filter type:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to set color filter",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getColorFilterStatus(): Promise<{
  enabled: boolean;
  filterType: ColorFilterType;
}> {
  try {
    const result = await runColorFilterAction("getStatus");
    const [enabledStr, typeStr] = result.split(",");
    return {
      enabled: enabledStr === "1",
      filterType: parseInt(typeStr, 10) as ColorFilterType,
    };
  } catch (error) {
    console.error("Error getting color filter status:", error);
    return { enabled: false, filterType: ColorFilterType.Grayscale };
  }
}
