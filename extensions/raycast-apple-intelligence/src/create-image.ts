import { closeMainWindow, showToast, Toast, LaunchProps } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.CreateImage }>) {
  await closeMainWindow();

  try {
    await runAppleScript(`
        tell application "System Events"
            set appList to name of processes
        end tell

        if application "Image Playground" is running then
          tell application "Image Playground"
            activate
            tell application "System Events"
              keystroke "w" using {command down}
              delay 1
            end tell
          end tell
        end if
        
        tell application "Image Playground"
          activate
          tell application "System Events"
            keystroke "n" using {command down}
            ${
              props.arguments.prompt
                ? `keystroke "${props.arguments.prompt}"
            key code 36`
                : ""
            }
          end tell
        end tell
        `);
  } catch (error) {
    console.error(error);

    await showToast({ title: "Failed to invoke Image Playground", style: Toast.Style.Failure });
  }
}
