import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { join } from "path";
import { isProcessRunning, runFile } from "./lib/process";
import { appendMarker, readMarkers, readState } from "./lib/state";
import { Preferences } from "./lib/types";

export default async function Command() {
  const state = readState();
  if (!state || !isProcessRunning(state.pid)) {
    await showHUD("⚠️ No active agent feedback recording");
    return;
  }

  const preferences = getPreferenceValues<Preferences>();
  const display = Math.max(
    1,
    Number.parseInt(preferences.displayNumber, 10) || 1,
  );
  const existing = readMarkers(state);
  const screenshotPath = join(
    state.sessionDir,
    `marker-${String(existing.length + 1).padStart(2, "0")}.png`,
  );
  await closeMainWindow();
  await new Promise((resolve) => setTimeout(resolve, 350));
  await runFile("/usr/sbin/screencapture", [
    "-x",
    "-C",
    `-D${display}`,
    screenshotPath,
  ]);
  appendMarker(state, {
    timestampMs: Date.now() - new Date(state.startedAt).getTime(),
    screenshotPath,
  });
  await showHUD(`📍 Feedback moment ${existing.length + 1} marked`);
}
