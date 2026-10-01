import { LaunchType, launchCommand, open, showHUD, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { SpotifastNotInstalledError, SpotifastNotRunningError } from "./spotifast";

const DOWNLOAD_URL = "https://spotifast.rocks/download/";

export async function showSpotifastError(error: unknown): Promise<void> {
  if (error instanceof SpotifastNotInstalledError) {
    const primaryAction: Toast.ActionOptions = {
      title: "Download Spotifast",
      onAction: () => open(DOWNLOAD_URL),
    };
    await showFailureToast(error, { title: error.message, message: "Set its path in preferences", primaryAction });
    return;
  }
  if (error instanceof SpotifastNotRunningError) {
    await showHUD("Spotifast is not running");
    return;
  }
  await showFailureToast(error, { title: "Spotifast command failed" });
}

// The menu bar command only polls every few seconds; nudge it so a change made
// from a hotkey shows up right away.
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // The user has not enabled the menu bar command.
  }
}

/** Runs a no-view command's body and reports its outcome as a HUD. */
export async function control(body: () => Promise<string>): Promise<void> {
  try {
    const message = await body();
    await refreshMenuBar();
    await showHUD(message);
  } catch (error) {
    await showSpotifastError(error);
  }
}

/** Parses an optional numeric argument, falling back when it is empty. */
export function parseAmount(value: string | undefined, fallback: number): number {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) throw new Error(`"${trimmed}" is not a positive number`);
  return Math.round(amount);
}
