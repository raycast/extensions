// =============================================================================
// FEEDBACK
// Raycast-facing output: failure toasts and the menu-bar refresh nudge.
// =============================================================================

import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

import { SidecarError } from "./backend";

const MENU_BAR_COMMAND = "sidecar-status";

/**
 * Surfaces a failure as a toast, keeping the underlying wording intact.
 *
 * @param error - Whatever was thrown.
 * @param title - Short headline for the toast.
 */
export async function reportError(error: unknown, title: string): Promise<void> {
  const message = error instanceof SidecarError || error instanceof Error ? error.message : String(error);

  await showToast({ style: Toast.Style.Failure, title, message });
}

/**
 * Asks Raycast to re-run the menu-bar command so its icon catches up.
 *
 * NOTE: A menu-bar command renders only when it runs, so without this nudge the
 *   icon would keep showing whatever was true when it was last opened. Failure is
 *   swallowed on purpose: launchCommand throws when the user has disabled the
 *   menu-bar command, which is a legitimate choice, not an error worth surfacing
 *   from a background tick.
 */
export async function refreshMenuBar(): Promise<void> {
  try {
    await launchCommand({ name: MENU_BAR_COMMAND, type: LaunchType.Background });
  } catch {
    // The menu-bar command is disabled; there is nothing to refresh.
  }
}
