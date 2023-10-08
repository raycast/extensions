import { showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getName } from "./getName";
import defaultBrowserId from 'default-browser-id';

interface Arguments {
  add: string;
} //

// This code will run a script to add the event to Fantastical
// It will first check if Fantastical is installed
// If it is not installed, it will show a toast

export default async (props: { arguments: Arguments }) => {
  const args = props.arguments;
  const name = await getName();
  const defaultBrowser = await defaultBrowserId();
  console.log(name);
  if (name !== undefined) {
    await runAppleScript(`
        tell application "${name}" 
            \n parse sentence "${args.add}" with add immediately\n
        end tell`);
    const optionsSuccess: Toast.Options = {
      style: Toast.Style.Success,
      title: "Event added",
      message: "Your event has been added to Fantastical.",
    };
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
