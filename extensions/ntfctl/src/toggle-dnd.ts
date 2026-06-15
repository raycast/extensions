import { showHUD, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

export default async function Command() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Toggling Do Not Disturb…",
  });
  try {
    execSync(`shortcuts run "DND Until I Leave" 2>&1 || true`, {
      encoding: "utf-8",
      timeout: 10_000,
    });
    toast.hide();
    await showHUD("🔕 Do Not Disturb toggled");
  } catch {
    toast.hide();
    // The shortcut might not exist — show a helpful message
    await showToast({
      style: Toast.Style.Failure,
      title: "DnD toggle failed",
      message:
        'Create a shortcut named "DND Until I Leave" in Shortcuts.app that toggles Focus → Do Not Disturb.',
    });
  }
}
