import { getSelectedText, Clipboard, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export default async function Command() {
  const tempFile = join(tmpdir(), `vim-anywhere-${Date.now()}.txt`);

  try {
    const selectedText = await getSelectedText();

    // Write selected text to temp file
    writeFileSync(tempFile, selectedText);

    // Get the frontmost app before switching to Terminal
    const frontmostApp = execSync(
      `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'`,
    )
      .toString()
      .trim();

    // Open vim in Terminal and wait for it to close
    const script = `
      tell application "Terminal"
        if (count of windows) is 0 then
          do script "/opt/homebrew/bin/nvim --clean -c 'set number relativenumber' '${tempFile}'; exit"
          activate
        else
          activate
          do script "/opt/homebrew/bin/nvim --clean -c 'set number relativenumber' '${tempFile}'; exit"
        end if
        set newTab to front window's selected tab
        repeat
          delay 0.5
          if not (exists newTab) then exit repeat
          if not (busy of newTab) then exit repeat
        end repeat
      end tell
    `;

    execSync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);

    // Return focus to the original app and wait for it to be ready
    execSync(`osascript -e 'tell application "${frontmostApp}" to activate' -e 'delay 0.35'`);

    // Read the modified content and paste it
    const modifiedText = readFileSync(tempFile, "utf-8");
    await Clipboard.paste(modifiedText);

    // Clean up temp file
    unlinkSync(tempFile);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to modify text",
      message: String(error),
    });

    // Clean up temp file on error
    try {
      unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}
