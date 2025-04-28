import { runAppleScript, showFailureToast } from "@raycast/utils";

export async function createNewWindow(profile?: string): Promise<void> {
  try {
    if (!profile) {
      await runAppleScript(`
        tell application "Dia"
          activate
          tell application "System Events"
            keystroke "n" using {command down}
          end tell
        end tell
      `);
      return;
    }

    await runAppleScript(`
      tell application "Dia"
        activate
        tell application "System Events"
          tell process "Dia"
            tell menu bar item "File" of menu bar 1
              click
              tell menu item "New Window" of menu "File"
                click
                delay 0.1
                click menu item "New ${profile} Window" of menu 1
              end tell
            end tell
          end tell
        end tell
      end tell
    `);
  } catch (error) {
    showFailureToast(error, { title: "Could not create new window" });
  }
}

export async function createNewIncognitoWindow(): Promise<void> {
  await runAppleScript(`
    tell application "Dia"
      activate
      tell application "System Events"
        keystroke "n" using {command down, shift down}
      end tell
    end tell
  `);
}
