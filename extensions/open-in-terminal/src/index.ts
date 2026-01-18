import { getSelectedFinderItems, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";

const getFinderPath = async (): Promise<string> => {
  const appleScript = `
    tell application "Finder"
        if not (running) or not (frontmost) then
            error "Finder not frontmost"
        end if

        if (count of selection) > 0 then
            set sel to item 1 of selection

            if class of sel is folder then
                return POSIX path of (sel as alias)
            else
                error "A file is selected. Please select a folder."
            end if
        else
            if (count of windows) > 0 then
                return POSIX path of (target of window 1 as alias)
            else
                error "No Finder window"
            end if
        end if
    end tell
  `;

  try {
    const result = await runAppleScript(appleScript);
    return result.trim();
  } catch {
    throw new Error("Please select a folder (not a file) in Finder.");
  }
};

export default async () => {
  const terminalApp = "com.apple.Terminal";

  try {
    const selectedFinderItems = await getSelectedFinderItems();

    if (selectedFinderItems.length) {
      for (const item of selectedFinderItems) {
        const stat = fs.statSync(item.path);
        if (!stat.isDirectory()) {
          throw new Error("File selected");
        }
      }

      for (const item of selectedFinderItems) {
        await open(item.path, terminalApp);
      }
      return;
    }

    const activeFinderPath = await getFinderPath();
    await open(activeFinderPath, terminalApp);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Please select a folder in Finder",
      message: "Files are not supported for this command.",
    });
  }
};
