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
  adjustBrightness as winAdjustBrightness,
  setBrightness as winSetBrightness,
  getBrightness as winGetBrightness,
} from "./ddc-ci";

const isWindows = platform() === "win32";

export interface SetBrightnessResult {
  displayName?: string;
  previousBrightness?: number;
}

export async function adjustBrightness(offset: number): Promise<boolean> {
  if (isWindows) {
    try {
      const monitors = await winAdjustBrightness(offset);
      if (monitors.length === 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Brightness-Capable Monitors Found",
          message: "No WMI or DDC/CI monitors detected",
        });
        return false;
      }
      return monitors.some((m) => m.setResult === true);
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
  };
}

export { winGetBrightness as getBrightness };
