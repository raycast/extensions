import { platform } from "os";
import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { BrightnessAction, makeScript } from "../script";
import {
  ensureLunarReady,
  getDisplays,
  getCursorDisplay,
  getBrightnessForDisplay,
  setBrightnessForDisplay,
} from "./lunar";
import {
  ensureTwinkleTrayReady,
  adjustBrightness as ttAdjustBrightness,
  setBrightness as ttSetBrightness,
} from "./twinkle-tray";

const isWindows = platform() === "win32";

export interface SetBrightnessResult {
  displayName?: string;
  previousBrightness?: number;
}

/**
 * Adjust brightness by offset. Returns true on success.
 * macOS: simulates brightness key press (offset sign determines direction).
 * Windows: uses Twinkle Tray --Offset for all monitors (auto-installs if needed).
 */
export async function adjustBrightness(offset: number): Promise<boolean> {
  if (isWindows) {
    try {
      const exe = await ensureTwinkleTrayReady();
      if (!exe) return false;
      await ttAdjustBrightness(exe, offset);
      return true;
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Adjust Brightness",
        message: error instanceof Error ? error.message : "An error occurred",
      });
      return false;
    }
  }

  await runAppleScript(makeScript(offset > 0 ? BrightnessAction.Up : BrightnessAction.Down));
  return true;
}

/**
 * Set absolute brightness level (1-100). Returns result on success, null on failure.
 * macOS: uses Lunar CLI with cursor display detection.
 * Windows: uses Twinkle Tray --Set for all monitors (auto-installs if needed).
 */
export async function setBrightness(level: number): Promise<SetBrightnessResult | null> {
  if (isWindows) {
    try {
      const exe = await ensureTwinkleTrayReady();
      if (!exe) return null;
      await ttSetBrightness(exe, level);
      return {};
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Set Brightness",
        message: error instanceof Error ? error.message : "An error occurred",
      });
      return null;
    }
  }

  if (!(await ensureLunarReady())) {
    return null;
  }

  const allDisplays = await getDisplays();
  if (allDisplays.length === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Displays Found",
      message: "Make sure Lunar is running and displays are connected",
    });
    return null;
  }

  const cursorDisplaySerial = await getCursorDisplay();
  let targetDisplay = allDisplays.find((d) => d.serial === cursorDisplaySerial);
  if (!targetDisplay) {
    targetDisplay = allDisplays.find((d) => d.main) || allDisplays[0];
  }

  const previousBrightness = await getBrightnessForDisplay(targetDisplay.serial);
  await setBrightnessForDisplay(targetDisplay.serial, level, targetDisplay.adaptive);

  return {
    displayName: targetDisplay.name,
    previousBrightness: previousBrightness ?? undefined,
  };
}
