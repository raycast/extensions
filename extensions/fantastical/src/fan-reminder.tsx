import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { isInstalled } from "./isInstalled";

interface Arguments {
  add: string;
}

export default async (props: { arguments: Arguments }) => {
  const args = props.arguments;
  if (await isInstalled()) {
    const text = `tell application "Fantastical" 
                        \n parse sentence "Todo ${args.add}" 
                    \n end tell`;
    await runAppleScript(text);
  } else {
    await showToast({
      title: "Fantastical is not installed",
      style: Toast.Style.Failure,
      message: "Please first install Fantastical to use this extension.",
    });
  }
};
