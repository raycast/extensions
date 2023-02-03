import { showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getName } from "./getName";

interface Arguments {
  add: string;
}

export default async (props: { arguments: Arguments }) => {
  const args = props.arguments;
  const name = await getName();
  if (name !== undefined) {
    await runAppleScript(`
        tell application "${name}" 
            \n parse sentence "TODO ${args.add}" with add immediately\n
        end tell`);
    const optionsSuccess: Toast.Options = {
        style: Toast.Style.Success,
        title: "Reminder added",
        message: "Your reminder has been added to Fantastical.",
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
          open("https://fantastical.app/");
        },
      },
    };
    showToast(options);
  }
};
