import { Toast, closeMainWindow, showToast } from "@raycast/api";
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

	close every window
	activate
	delay 1 -- Wait for a second to ensure Mail app is activated
	tell application "System Events" to keystroke "0" using command down -- Command-0 is the typical shortcut to open main viewer window in Mail
end tell
  `;

  await runAppleScript(script);
}

export default async function MarkAllAsRead() {
  await closeMainWindow();
  try {
    await showToast(
      Toast.Style.Animated,
      "Closing the Mail window for better performance, The window will reappear when this is done.",
    );
    await script();
  } catch (error) {
    await showToast(Toast.Style.Failure, "Failed to mark all emails as read");
    return;
  }

  await showToast(Toast.Style.Success, "All emails marked as read");
}
