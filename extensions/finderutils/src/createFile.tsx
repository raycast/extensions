import { Toast, showToast, showHUD, getPreferenceValues, LaunchProps } from "@raycast/api";
import { runAppleScript } from "./utils";

interface Preferences {
  extensions: string;
  printSaveDirectory: boolean;
  closeAfterCreation: boolean;
}

export default async (props: LaunchProps<{ arguments: { filename: string } }>) => {
  const autoOpen: Array<string> = getPreferenceValues<Preferences>().extensions?.trim().split(",");
  const printSaveDirectory: boolean = getPreferenceValues<Preferences>().printSaveDirectory;
  const closeAfterCreation: boolean = getPreferenceValues<Preferences>().closeAfterCreation;

  const filename: string = props.arguments.filename;
  const extension: string = filename?.split(".").pop() || "";

  let script = `
          if application "Finder" is not running then
  	        return "Finder not running"
          end if

          tell application "Finder"
            set pathList to (quoted form of POSIX path of (insertion location as alias))
            
            if exists (POSIX path of (insertion location as alias)) & "${filename}" as POSIX file then
		          return "Already exists"
	          end if
          end tell

          set command to "touch " & pathList & "${filename}"
          do shell script command

          return pathList
      `;

  if (autoOpen !== undefined && (autoOpen.includes("*") || autoOpen.includes(extension))) {
    script += `
      set command to "open " & pathList & "${filename}"
      do shell script command
    `;
  }

  try {
    const result = (await runAppleScript(script)).trim();

    if (result == "Already exists" || result == "Finder not running") {
      await showToast(Toast.Style.Failure, "File creation error:", result);
    } else {
      if (closeAfterCreation) {
        if (printSaveDirectory === true) {
          await showHUD(`✅ File created -  ${result.substring(1, result.length - 2)}/${filename}`, {
            clearRootSearch: true,
          });
        } else {
          await showHUD("✅ File created", { clearRootSearch: true });
        }
      } else {
        if (printSaveDirectory === true) {
          await showToast(Toast.Style.Success, "File created", `${result.substring(1, result.length - 2)}/${filename}`);
        } else {
          await showToast(Toast.Style.Success, "File created");
        }
      }
    }
  } catch {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
