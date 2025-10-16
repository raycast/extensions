import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { playSvga } from "swift:../swift/svga-player";
import { runAppleScript } from "@raycast/utils";

export default async function Main() {
  await runPipeline();

  async function runPipeline() {
    if (await tryReadCurrentFocus()) {
      return;
    }
    if (await tryReadClipboard()) {
      return;
    }
    showHUD("No SVGA file found");
    return;
  }

  async function tryReadCurrentFocus(): Promise<boolean> {
    const checkFinderActive = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
      return frontApp = "Finder"
    end tell
    `;

    const getCurrentFocus = `
      tell application "Finder"
        set these_items to the selection as alias list
        if (count of these_items) > 0 then
          set this_item to (item 1 of these_items) as alias
          return POSIX path of this_item
        end if
      end tell
      return ""
    `;

    try {
      const isFinderActive = await runAppleScript(checkFinderActive);
      if (isFinderActive !== "true") {
        return false;
      }

      const currentFocus = (await runAppleScript(getCurrentFocus)).trim();

      if (currentFocus) {
        if (isValidSvga(currentFocus)) {
          const localPath = `file://${currentFocus}`;
          await playSvga(localPath);
          return true;
        } else {
          throw new Error("Not a valid SVGA file");
        }
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title:
          error instanceof Error
            ? error.message
            : "Failed to read current focus",
      });
      return true;
    }
    return false;
  }

  async function tryReadClipboard(): Promise<boolean> {
    const clipboardItem = await Clipboard.read();
    if (clipboardItem?.file) {
      const file = clipboardItem.file;
      if (isValidSvga(file)) {
        await playSvga(file);
        return true;
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Not a valid SVGA file",
        });
        return true;
      }
    } else if (clipboardItem?.text) {
      const text = clipboardItem.text;
      if (text.startsWith("http") && text.endsWith(".svga")) {
        await playSvga(text);
        return true;
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Not a valid SVGA file",
        });
        return true;
      }
    }
    return false;
  }

  function isValidSvga(filePath: string) {
    return filePath.endsWith(".svga");
  }
}
