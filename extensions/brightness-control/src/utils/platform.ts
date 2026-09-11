import { platform } from "os";
import { showToast, Toast } from "@raycast/api";
import {
  adjustCursorBrightness,
  ensureLunarReady,
  getDisplays,
  getCursorDisplay,
  getBrightnessForDisplay,
  setBrightnessForDisplay,
} from "./lunar";
import {
  adjustBrightness as winAdjustBrightness,
  setBrightness as winSetBrightness,
  getBrightness as winGetBrightness,
} from "./ddc-ci";

const isWindows = platform() === "win32";

export interface SetBrightnessResult {
  displayName?: string;
  previousBrightness?: number;
  brightness?: number;
}

export interface AdjustBrightnessResult {
  displayName?: string;
  brightness?: number;
}

export async function adjustBrightness(offset: number): Promise<AdjustBrightnessResult | null> {
  if (isWindows) {
    try {
      const monitors = await winAdjustBrightness(offset);
      if (monitors.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Brightness-Capable Monitors Found",
          message: "No WMI or DDC/CI monitors detected",
        });
        return null;
      }

      const primary = monitors.find((m) => m.setResult === true) || monitors[0];
      if (!primary.setResult) {
        return null;
      }

      return {
        displayName: primary.description || undefined,
        brightness: primary.newBrightness,
      };
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Adjust Brightness",
        message: error instanceof Error ? error.message : "An error occurred",
      });
      return null;
    }
  }

  if (!(await ensureLunarReady())) {
    return null;
  }

  try {
    const result = await adjustCursorBrightness(offset);
    return {
      displayName: result.name,
      brightness: result.brightness,
    };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Adjust Brightness",
      message: error instanceof Error ? error.message : "An error occurred",
    });
    return null;
  }
}

export async function setBrightness(level: number): Promise<SetBrightnessResult | null> {
  if (isWindows) {
    try {
      const monitors = await winSetBrightness(level);
      if (monitors.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Brightness-Capable Monitors Found",
          message: "No WMI or DDC/CI monitors detected",
        });
        return null;
      }

      const primary = monitors.find((m) => m.setResult === true) || monitors[0];
      return {
        displayName: primary.description || undefined,
        previousBrightness: primary.brightness,
        brightness: primary.newBrightness,
      };
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
    brightness: level,
  };
}

export { winGetBrightness as getBrightness };
