import { showHUD, Clipboard, getFrontmostApplication, closeMainWindow } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main() {
  try {
    // Check if Notion is the frontmost application
    const frontmostApp = await getFrontmostApplication();
    if (frontmostApp.name !== "Notion") {
      await showHUD(`Please open Notion (current: ${frontmostApp.name})`);
      return;
    }

    // Close Raycast window immediately
    await closeMainWindow();

    // Wait for Raycast to fully close
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Save current clipboard content
    const previousClipboard = await Clipboard.readText();

    // Get Notion page information via AppleScript
    const script = `
      tell application "Notion"
        activate
      end tell

      tell application "System Events"
        tell process "Notion"
          -- Get window title (works for both fullscreen and normal windows)
          set windowTitle to ""
          try
            set windowElements to (every UI element whose role is "AXWindow")
            repeat with elem in windowElements
              try
                set elemTitle to value of attribute "AXTitle" of elem
                if elemTitle is not "" then
                  set windowTitle to elemTitle
                  exit repeat
                end if
              end try
            end repeat
          end try
          
          -- Explicitly focus the window
          try
            perform action "AXRaise" of front window
          on error
            -- Ignore error for fullscreen display
          end try
          
          delay 0.2
          
          -- Copy URL with Cmd + L
          keystroke "l" using command down
          delay 0.3
          set linkUrl to the clipboard as text
          
          return windowTitle & "|||" & linkUrl
        end tell
      end tell
    `;

    const result = await runAppleScript(script);

    // Validate separator exists exactly once
    const separatorCount = (result.match(/\|\|\|/g) || []).length;
    if (separatorCount !== 1) {
      await showHUD("Failed to parse Notion page information. Please try again.");
      if (previousClipboard) {
        await Clipboard.copy(previousClipboard);
      }
      return;
    }

    const parts = result.split("|||");
    const windowTitle = parts[0];
    const linkUrl = parts[1];

    // URL validation
    if (!linkUrl || !linkUrl.includes("notion.so")) {
      await showHUD("Failed to copy Notion link. Please try again.");
      if (previousClipboard) {
        await Clipboard.copy(previousClipboard);
      }
      return;
    }

    // Process title - check if empty first, then escape square brackets
    let cleanedTitle: string;
    if (!windowTitle || windowTitle.trim() === "") {
      cleanedTitle = "Notion Page";
    } else {
      cleanedTitle = windowTitle.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
    }

    const markdownLink = `[${cleanedTitle}](${linkUrl})`;

    await Clipboard.copy(markdownLink);

    await showHUD(`Copied: ${markdownLink}`);
  } catch (error) {
    await showHUD(`No Notion page link detected: ${error instanceof Error ? error.message : String(error)}`);
  }
}
