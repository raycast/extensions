import { closeMainWindow, getFrontmostApplication, getPreferenceValues, PopToRootType, showHUD } from "@raycast/api";
import { setTimeout as sleep } from "node:timers/promises";
import { animateKickflip } from "swift:../../swift/window-kickflip";

let isRunning = false;

// closeMainWindow resolves before macOS hands focus back, so wait until Raycast is no longer in front.
async function waitForFocusToLeaveRaycast(): Promise<void> {
  for (let waited = 0; waited < 600; waited += 20) {
    const app = await getFrontmostApplication().catch(() => undefined);
    if (app && !app.bundleId?.startsWith("com.raycast")) return;
    await sleep(20);
  }
}

export async function doKickflip(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    // Keep the view command alive and let focus return to the previous app.
    await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Suspended });
    await waitForFocusToLeaveRaycast();
    // Swift finds the focused window and animates an in-memory snapshot; the real window is never moved.
    const { playSound } = getPreferenceValues<Preferences>();
    await animateKickflip(playSound);
  } catch (error) {
    // Raycast is closed by now, so a toast would go unseen.
    await showHUD(error instanceof Error ? error.message : String(error), {
      popToRootType: PopToRootType.Suspended,
    });
  } finally {
    isRunning = false;
  }
}
