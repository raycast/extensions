import { Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runAppleScript, runCmuxCommand } from "./utils";

export default async () => {
  const finderScript = `
      if application "Finder" is not running then
          error "Finder is not running"
      end if

      tell application "Finder"
          if (count of Finder windows) = 0 then error "No Finder window open"
          try
              set pathList to POSIX path of (folder of the front window as alias)
              return pathList
          on error
              error "Could not access Finder window path"
          end try
      end tell
  `;

  try {
    const directory = (await runAppleScript(finderScript)).trim();
    const result = await runCmuxCommand([directory]);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showFailureToast(err);
  }
};
