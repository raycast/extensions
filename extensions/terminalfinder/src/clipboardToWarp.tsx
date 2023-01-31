import { Clipboard, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export default async () => {
  const directory = await Clipboard.readText();

  let script: string;
  script = `
      set command to "open -a /Applications/Warp.app " & "${directory}"
      do shell script command
  `;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
