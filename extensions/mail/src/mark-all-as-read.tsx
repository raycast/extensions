import { Toast, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

async function script(): Promise<void> {
  const script = `
    tell application "Mail"
      set visible of window 1 to false 
      set read status of every message of every mailbox of every account where its read status = false to true
      set visible of window 1 to true
    end tell
`;

  runAppleScript(script);
}

export default async function MarkAllAsRead() {
  try {
    await script();
    showHUD("Please note that it may take a while to update");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to mark all as read");
    console.error(error);
  }
}
