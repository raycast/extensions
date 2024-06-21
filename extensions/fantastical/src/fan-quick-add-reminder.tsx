import { getPreferenceValues, open, showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import defaultBrowserId from "default-browser-id";
import { getName } from "./getName";

export default async (props: { arguments: Arguments.FanQuickAddReminder }) => {
  const args = props.arguments;
  const name = await getName();
  const defaultBrowser = await defaultBrowserId();
  const preferences = getPreferenceValues<Preferences>();
  if (name !== undefined) {
    const escapedAdd = args.add.replace(/"/g, '\\"');
    await runAppleScript(`
        tell application "${name}" 
          parse sentence "TODO ${escapedAdd}" with add immediately
        end tell`);
    const optionsSuccess: Toast.Options = {
      style: Toast.Style.Success,
      title: "Reminder added",
      message: "Your reminder has been added to Fantastical.",
    };
    // Will check if extension's hide preference is set
    // If true, it will show a HUD, else it will show a toast
    if (preferences.hideOnAdd) {
      showHUD(`Reminder added`);
    } else {
      showToast(optionsSuccess);
    }
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
