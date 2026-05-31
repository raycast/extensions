import { closeMainWindow, open, showHUD } from "@raycast/api";

// Fire a macshot:// URL scheme action, then dismiss Raycast.
export async function trigger(action: string, hud?: string) {
  await closeMainWindow();
  try {
    await open(`macshot://${action}`);
    if (hud) await showHUD(hud);
  } catch {
    await showHUD("❌ macshot not installed");
  }
}

export async function openImage(file: string) {
  await closeMainWindow();
  try {
    await open(`macshot://open?file=${encodeURIComponent(file)}`);
  } catch {
    await showHUD("❌ macshot not installed");
  }
}
