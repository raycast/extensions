import { Toast, showHUD, showToast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

async function script(): Promise<void> {
  const script = `
  tell application "Mail"
  set visible of every window to false

  set allAccounts to every account
  repeat with anAccount in allAccounts
      set allMailboxes to every mailbox of anAccount
      repeat with aMailbox in allMailboxes
          set unreadMessages to (every message of aMailbox whose read status is false)
          repeat with aMessage in unreadMessages
              set read status of aMessage to true
          end repeat
      end repeat
  end repeat

  set visible of every window to true
  activate
end tell
`;

  runAppleScript(script);
}

export default async function MarkAllAsRead() {
  try {
    await script();
    showHUD("Closing the Mail window for better performance, The window will reappear when this is done.");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to mark all emails as read");
    console.error(error);
    return;
  }

  await showToast(Toast.Style.Success, "All emails marked as read");
}
