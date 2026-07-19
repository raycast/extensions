// =============================================================================
// FEEDBACK
// Turns command results and failures into Raycast HUDs and toasts.
// =============================================================================

import { showToast, Toast } from "@raycast/api";

import { SidecarError } from "./backend";

/**
 * Surfaces a failure as a toast, keeping BetterDisplay's own wording intact.
 *
 * @param error - Whatever was thrown.
 * @param title - Short headline for the toast.
 */
export async function reportError(error: unknown, title: string): Promise<void> {
  const message = error instanceof SidecarError || error instanceof Error ? error.message : String(error);

  await showToast({ style: Toast.Style.Failure, title, message });
}
