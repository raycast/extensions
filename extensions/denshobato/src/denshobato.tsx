import { Form, ActionPanel, Action, showHUD, Clipboard } from "@raycast/api";
import { execAppleScript } from "./utils/applescript";

type Values = {
  textarea: string;
};

export default function Command() {
  async function checkPermissions(): Promise<boolean> {
    try {
      // Test if we can run AppleScript by executing a simple command
      await execAppleScript('tell application "System Events" to get name of current application');
      return true;
    } catch (error) {
      console.log("AppleScript permission check failed:", error);
      return false;
    }
  }

  async function sendToFocusedApp(text: string): Promise<void> {
    console.log("Attempting to send message:", text);

    try {
      // Method 1: Direct paste using Raycast API
      await Clipboard.paste(text);
      console.log("Message pasted successfully using Clipboard.paste");
    } catch (error) {
      console.error("Clipboard.paste failed, trying alternative method:", error);

      // Method 2: Copy to clipboard and notify user
      const originalClipboard = await Clipboard.read();
      try {
        await Clipboard.copy(text);
        console.log("Message copied to clipboard successfully");

        // Use AppleScript as fallback
        await execAppleScript(`
          tell application "System Events"
            keystroke "v" using command down
          end tell
        `);
        console.log("AppleScript executed successfully");

        // Wait a bit before restoring clipboard
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Restore original clipboard
        if (originalClipboard.text) {
          await Clipboard.copy(originalClipboard.text);
          console.log("Original clipboard restored");
        } else if (originalClipboard.file) {
          console.log("File in Clipboard - not restoring");
        }
      } catch (fallbackError) {
        // Restore clipboard even if fallback fails
        if (originalClipboard.text) {
          await Clipboard.copy(originalClipboard.text);
        }
        throw fallbackError;
      }
    }
  }

  async function handleSubmit(values: Values) {
    const text = values.textarea.trim();
    if (!text) {
      await showHUD("Please enter message");
      return;
    }

    console.log("Starting submission with message:", text);

    // Check permissions first
    const hasPermissions = await checkPermissions();
    if (!hasPermissions) {
      console.log("Permissions not available, falling back to clipboard only");
      await Clipboard.copy(text);
      await showHUD("Message copied to clipboard (AppleScript permissions required for auto-paste)");
      return;
    }

    try {
      await sendToFocusedApp(text);

      // Also copy to clipboard for user convenience
      await Clipboard.copy(text);
      console.log("Message also saved to clipboard for user convenience");

      // Verify clipboard content
      const clipboardContent = await Clipboard.read();
      console.log("Clipboard verification:", clipboardContent.text);

      await showHUD("Message sent successfully!");
    } catch (error) {
      console.error("Error in handleSubmit:", error);

      // Try to provide more specific error messages
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);

        if (error.message.includes("permission") || error.message.includes("access")) {
          await showHUD("Permission denied. Please check accessibility settings.");
        } else if (error.message.includes("AppleScript")) {
          await showHUD("AppleScript failed. Message saved to clipboard instead.");
        } else {
          await showHUD(`Failed: ${error.message}`);
        }
      } else {
        await showHUD("Failed to send message...");
      }
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Send Message" />
        </ActionPanel>
      }
    >
      <Form.Description text="📮 Dear Focused Application," />
      <Form.TextArea id="textarea" title="Message" placeholder="Enter message to send..." />
      <Form.Description text="                                                     Sincerely, You 🕊️" />
      <Form.Description text="" />
      <Form.Separator />
      <Form.Description text="💡 Enter or Shift + Enter: New line" />
    </Form>
  );
}
