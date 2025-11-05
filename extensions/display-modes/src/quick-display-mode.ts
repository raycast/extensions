import { LaunchProps, showHUD, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { listDisplays, setMode, formatDisplayMode } from "./utils";
import { DisplayInfo, Mode, areModesEqual } from "./types";

// Scoring constants for findClosestMode
const EXACT_MATCH_SCORE = 1500;
const MAX_DIFF_SCORE = 1000;
const SUITABLE_FOR_UI_BONUS = 500;
const SAFE_FOR_HARDWARE_BONUS = 500;

export default async function QuickDisplayMode(props: LaunchProps<{ arguments: Arguments.QuickDisplayMode }>) {
  const { display: displayIdentifier, height, refreshRate } = props.arguments;

  const targetHeight = parseInt(height, 10);
  const targetRefreshRate = refreshRate ? parseInt(refreshRate, 10) : undefined;

  if (isNaN(targetHeight) || targetHeight <= 0) {
    showFailureToast("Invalid height value");
    return;
  }

  if (refreshRate && (targetRefreshRate === undefined || isNaN(targetRefreshRate) || targetRefreshRate <= 0)) {
    showFailureToast("Invalid refresh rate value");
    return;
  }

  try {
    const displays = await listDisplays();
    const displayNames = JSON.parse((await LocalStorage.getItem<string>("displayNames")) || "{}");

    if (!displays) {
      showFailureToast("Failed to get display list");
      return;
    }

    let targetDisplay: DisplayInfo | undefined;

    const displayId = parseInt(displayIdentifier, 10);
    if (!isNaN(displayId)) {
      targetDisplay = displays.find((d) => d.display.id === displayId);
    } else {
      const lowerCaseIdentifier = displayIdentifier.toLowerCase();
      targetDisplay = displays.find((d) => (displayNames[d.display.id] || "").toLowerCase() === lowerCaseIdentifier);
    }

    if (!targetDisplay) {
      const availableDisplays = displays.map((d) => displayNames[d.display.id] || d.display.id).join(", ");
      showFailureToast(`Display "${displayIdentifier}" not found. Available: ${availableDisplays}`);
      return;
    }

    const closestMode = findClosestMode(targetDisplay, targetHeight, targetRefreshRate);

    if (!closestMode) {
      showFailureToast(`No suitable mode found for display ${targetDisplay.display.id}`);
      return;
    }

    if (areModesEqual(closestMode, targetDisplay.currentMode)) {
      const modeDescription = formatDisplayMode(closestMode);
      await showHUD(`✅ Display ${targetDisplay.display.id} already at ${modeDescription}`);
      return;
    }

    const result = await setMode(targetDisplay.display.id, closestMode);

    if (result) {
      const modeDescription = formatDisplayMode(closestMode);
      await showHUD(`✅ Display ${targetDisplay.display.id} changed to ${modeDescription}`);
    } else {
      showFailureToast(`Failed to change display ${targetDisplay.display.id} mode`);
    }
  } catch (error) {
    console.error("Error in quick display modes:", error);
    showFailureToast("Error changing display mode");
  }
}

function findClosestMode(display: DisplayInfo, targetHeight: number, targetRefreshRate?: number): Mode | undefined {
  const availableModes = display.modes.filter((mode) => !mode.unavailable);

  if (availableModes.length === 0) {
    return undefined;
  }

  const modesWithScore = availableModes.map((mode) => {
    let score = 0;

    // Prefer exact matches, then smaller differences

    const heightDiff = Math.abs(mode.height - targetHeight);
    score += heightDiff === 0 ? EXACT_MATCH_SCORE : Math.max(0, MAX_DIFF_SCORE - heightDiff);

    if (targetRefreshRate !== undefined) {
      const refreshRateDiff = Math.abs(mode.refreshRate - targetRefreshRate);
      score += refreshRateDiff === 0 ? EXACT_MATCH_SCORE : Math.max(0, MAX_DIFF_SCORE - refreshRateDiff);
    }

    // Bonus for modes that are suitable for UI and safe for hardware
    if (mode.isSuitableForUI) score += SUITABLE_FOR_UI_BONUS;
    if (mode.isSafeForHardware) score += SAFE_FOR_HARDWARE_BONUS;

    return { mode, score };
  });

  modesWithScore.sort((a, b) => b.score - a.score);

  return modesWithScore[0].mode;
}
