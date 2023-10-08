import { showToast, Toast, open } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { getName } from "./getName";
import defaultBrowserId from "default-browser-id";

interface Arguments {
  add: string;
}

export default async (props: { arguments: Arguments }) => {
  const args = props.arguments;
  const name = await getName();
  const defaultBrowser = await defaultBrowserId();
  if (name !== undefined) {
    const text = `tell application "${name}" 
                        \n parse sentence "Todo ${args.add}" 
                    \n end tell`;
    await runAppleScript(text);
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
