import { open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import defaultBrowserId from "default-browser-id";
import { getName } from "./getName";
import { FanAddReminderEditable } from "./types";

export default async (props: { arguments: FanAddReminderEditable }) => {
  const args = props.arguments;
  const name = await getName();
  const defaultBrowser = await defaultBrowserId();
  if (name !== undefined) {
    const escapedInputText = args.inputText.replace(/"/g, '\\"');

    await runAppleScript(`
      tell application "${name}"
        parse sentence "Todo ${escapedInputText}"
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
