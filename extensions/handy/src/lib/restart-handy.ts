import { Toast } from "@raycast/api";
import { applySettingsAndReload } from "./handy";

/**
 * Persist the setting and relaunch Handy, reporting progress and failures on
 * `toast`.
 *
 * `applySettingsAndReload` rejects when Handy can't be terminated — the app then
 * keeps running with the old in-memory setting and is never relaunched — so the
 * rejection is surfaced here instead of ending the restart silently.
 */
export async function restartHandy(
  apply: () => void,
  handyBinaryPath: string,
  toast: Toast,
  onApplied?: () => void,
): Promise<void> {
  toast.style = Toast.Style.Animated;
  toast.title = "Restarting Handy…";
  toast.message = undefined;
  try {
    await applySettingsAndReload(apply, handyBinaryPath);
    onApplied?.();
    toast.style = Toast.Style.Success;
    toast.title = "Handy restarted";
  } catch (err) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't restart Handy";
    toast.message = err instanceof Error ? err.message : String(err);
  }
}

/** "Restart Handy" toast action, used when the live (GUI-scripted) switch fails. */
export function restartHandyAction(
  apply: () => void,
  handyBinaryPath: string,
  onApplied?: () => void,
): Toast.ActionOptions {
  return {
    title: "Restart Handy",
    onAction: (toast) => {
      void restartHandy(apply, handyBinaryPath, toast, onApplied);
    },
  };
}
