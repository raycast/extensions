import { closeMainWindow, showToast, Toast, LaunchProps } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function main(props: LaunchProps<{ arguments: Arguments.TypeToSiri }>) {
  await closeMainWindow();
  try {
    await runAppleScript(`
        tell application "System Events"
            key code 53
        end tell
        delay 0.5
        tell application "System Events" to tell the front menu bar of process "SystemUIServer"
            tell (first menu bar item whose description is "Siri")
                perform action "AXPress"
            end tell
        end tell
        ${
          props.arguments.prompt &&
          `
          delay 0.5
          tell application "System Events"
              set textToType to "${props.arguments.prompt}"
              keystroke textToType
              key code 36
          end tell
        `
        }
      `);
  } catch (error) {
    console.error(error);
    await showToast({
      title: "Failed to summon Siri. Ensure Siri is enabled in the Menu Bar.",
      style: Toast.Style.Failure,
    });
  }
}
