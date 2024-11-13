import { closeMainWindow, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import defaultBrowserId from "default-browser-id";
import { getName } from "./getName";
import { FanQuickAddReminder, Preferences } from "./types";

export default async (props: { arguments: FanQuickAddReminder }) => {
  const args = props.arguments;
  const name = await getName();
  const defaultBrowser = await defaultBrowserId();
  const preferences = getPreferenceValues<Preferences>();
  if (name !== undefined) {
    const escapedInputText = args.inputText.replace(/"/g, '\\"');

    await runAppleScript(`
        tell application "${name}" 
          parse sentence "TODO ${escapedInputText}" with add immediately
        end tell`);

    const optionsSuccess: Toast.Options = {
      style: Toast.Style.Success,
      title: "Reminder added",
      message: "Your reminder has been added to Fantastical.",
    };

    if (preferences.hideOnAdd) {
      await closeMainWindow();
    }

    showToast(optionsSuccess);
  } else {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "Fantastical is not installed",
      message: "Please first install Fantastical to use this extension.",
      primaryAction: {
        title: "Install Fantastical",
        onAction: () => {
          open("https://fantastical.app/", defaultBrowser);
        },
      },
    };
    showToast(options);
  }
};
