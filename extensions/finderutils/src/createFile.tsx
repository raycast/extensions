import { Toast, showToast, getPreferenceValues, LaunchProps } from "@raycast/api";
import { runAppleScript } from "./utils";

interface Preferences {
  extensions: string;
}

export default async (props: LaunchProps<{ arguments: { filename: string } }>) => {
  const autoOpen: Array<string> = getPreferenceValues<Preferences>().extensions?.trim().split(",");

  const filename: string = props.arguments.filename;
  const extension: string = filename?.split(".").pop() || "";

  let script = `
          if application "Finder" is not running then
  	        return "Finder not running"
          end if

          tell application "Finder"
            set pathList to (quoted form of POSIX path of (folder of the front window as alias))

            if exists (POSIX path of (folder of the front window as alias)) & "${filename}" as POSIX file then
		          return "Already exists"
	          end if
          end tell

          set command to "touch " & pathList & "${filename}"
          do shell script command
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
      await showToast(Toast.Style.Success, "Done", result);
    }
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
