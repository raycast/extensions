import { showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { makeFriendly } from "@utils/path-helpers";
import { promisify } from "util";
import { exec } from "child_process";
import { base64ShellSanitize } from "@utils/misc";
const asyncExec = promisify(exec);

export default async function Command() {
  let finderPath = "";

  // Show initial toast
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Adding directory to zoxide...",
  });

  try {
    finderPath = await runAppleScript(`
      tell application "Finder"
        if exists window 1 then
          set selectedItems to selection
          if (count of selectedItems > 0) then
            set selectedItem to item 1 of selectedItems
          else
            set selectedItem to ""
          end if

          if class of selectedItem is folder or class of selectedItem is disk then
            set currentFolder to selectedItem as string
          else
            set currentFolder to target of front window as string
          end if
          set currentPath to POSIX path of (currentFolder as text)
        else
          set currentPath to ""
        end if
      end tell
    `);
    if (!finderPath || !finderPath.length) throw new Error("No open finder window");
    finderPath = finderPath.endsWith("/") ? finderPath.slice(0, -1) : finderPath;

    const { stderr } = await asyncExec(`zoxide add "${base64ShellSanitize(finderPath)}"`, {
      env: {
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/opt/homebrew/sbin",
      },
    });
    if (stderr.length) throw new Error(stderr);

    toast.style = Toast.Style.Success;
    toast.title = "Added to zoxide";
    toast.message = makeFriendly(finderPath);
    try {
      launchCommand({ name: "search-directories", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Failed to launch search-directories:", error);
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to add to zoxide";
    toast.message = error instanceof Error ? error.message : (error as string);
  }

  return null;
}
