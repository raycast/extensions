import { showHUD, getPreferenceValues } from "@raycast/api";
import { get, loadHistory, getCycleState, setCycleState } from "./clipboard";
import { setClipboard } from "./utils";

interface CyclePreferences {
  cycleLimit: string;
  cycleTimeout: string;
}

export default async function () {
  const prefs = getPreferenceValues<CyclePreferences>();
  const cycleLimit = Number(prefs.cycleLimit) || 5;
  const cycleTimeout = Number(prefs.cycleTimeout) || 2000;

  await loadHistory();
  const cycleState = await getCycleState();
  const now = Date.now();

  // Determine new position
  let newPosition: number;
  if (now - cycleState.timestamp < cycleTimeout) {
    // Continue cycling - advance to next position
    newPosition = (cycleState.position + 1) % cycleLimit;
  } else {
    // Timeout expired - start fresh
    newPosition = 0;
  }

  // Get the entry at this position
  const text = get(newPosition);
  if (!text) {
    await showHUD("No history");
    return;
  }

  // Save new cycle state
  await setCycleState(newPosition, now);

  // Copy to clipboard
  await setClipboard(text);

  // Show HUD with position and preview
  const preview = text.length > 25 ? text.substring(0, 25) + "..." : text;
  await showHUD(`[${newPosition + 1}/${cycleLimit}] ${preview}`);
}
