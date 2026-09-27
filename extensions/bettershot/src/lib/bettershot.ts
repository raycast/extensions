import { closeMainWindow, open, showHUD } from "@raycast/api";

export type BetterShotAction =
  | "capture/region"
  | "capture/fullscreen"
  | "capture/window"
  | "ocr"
  | "color-picker"
  | "record"
  | "settings";

export async function runAction(action: BetterShotAction): Promise<void> {
  try {
    // Wait for Raycast to close so its window is not part of the capture.
    await closeMainWindow({ clearRootSearch: true });
    await open(`bettershot://${action}`);
    // URL dispatch cannot confirm capture completion. Avoid a success HUD,
    // which could also appear in a screenshot.
  } catch {
    await showHUD(
      "Could not open BetterShot. Check that it is installed and opens normally.",
    );
  }
}
