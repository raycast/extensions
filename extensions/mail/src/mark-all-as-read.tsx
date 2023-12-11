import { Toast, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

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

export default async function command() {
  try {
    await script();
    await showToast(Toast.Style.Success, "Marked all as read. Please note that it may take a while to update the UI.");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to mark all as read");
    console.error(error);
  }
}
