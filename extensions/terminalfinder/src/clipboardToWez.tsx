import { Clipboard, Toast, showToast } from "@raycast/api";
import { runAppleScript } from "./utils";

export default async () => {
  const directory = await Clipboard.readText();

  const script = `
      set command to "open -n -b 'com.github.wez.wezterm' --args start --cwd " & "${directory}"
      do shell script command
  `;
  try {
    const result = await runAppleScript(script);
    await showToast(Toast.Style.Success, "Done", result);
  } catch (err) {
    await showToast(Toast.Style.Failure, "Something went wrong");
  }
};
