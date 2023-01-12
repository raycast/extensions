import { showToast, Toast, open } from "@raycast/api";
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
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Fantastical is not installed",
      message: "Please first install Fantastical to use this extension.",
      primaryAction: {
        title: "Install Fantastical",
        onAction: () => {
          open("https://fantastical.app/");
        },
      },
    };

    showToast(options);
  }
};
