import { open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import defaultBrowserId from "default-browser-id";
import { getName } from "./getName";
import { FanAddEventEditable } from "./types";

export default async (props: { arguments: FanAddEventEditable }) => {
  const args = props.arguments;
  const name = await getName();
  const defaultBrowser = await defaultBrowserId();
  if (name !== undefined) {
    const escapedInputText = args.inputText.replace(/"/g, '\\"');

    await runAppleScript(`
      tell application "${name}" 
        parse sentence "${escapedInputText}" 
      end tell`);
  } else {
    await showToast({
      title: "Fantastical is not installed",
      style: Toast.Style.Failure,
      message: "Please first install Fantastical to use this extension.",
      primaryAction: {
        title: "Install Fantastical",
        onAction: () => {
          open("https://fantastical.app/", defaultBrowser);
        },
      },
    });
  }
};
