import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export default async function command() {
  const { delay } = getPreferenceValues<Preferences.SendToPhotoMechanic>();
  const delaySeconds = Math.max(0.3, parseFloat(delay) || 0.7);

  await showToast({ style: Toast.Style.Animated, title: "Sending to Photo Mechanic…" });

  try {
    await runAppleScript(`
      -- Verify Lightroom Classic is running (cloud Lightroom has no AppleScript interface)
      set lrBundle to "com.adobe.LightroomClassicCC7"
      set lrRunning to false
      try
        tell application "System Events"
          set lrRunning to (count of (processes whose bundle identifier is lrBundle)) > 0
        end tell
      end try
      if not lrRunning then
        error "Lightroom Classic isn't running. Note: cloud Lightroom is not supported."
      end if

      -- Bring Lightroom forward and trigger Library > Show in Finder (⌘R)
      tell application id lrBundle to activate
      delay 0.25
      tell application "System Events"
        keystroke "r" using command down
      end tell
      delay ${delaySeconds}

      -- Read the revealed file path from Finder
      set thePath to ""
      tell application "Finder"
        set theSel to selection
        if theSel is {} then error "No photo selected, or the original is offline."
        set thePath to POSIX path of ((item 1 of theSel) as alias)
      end tell

      -- Confirm the file is actually readable (catches offline network drives)
      try
        do shell script "test -r " & quoted form of thePath
      on error
        error "File not readable — check if the drive is mounted: " & thePath
      end try

      -- Hand off to Photo Mechanic by bundle ID (replicates drag-onto-icon behavior)
      set pmBundles to {"com.camerabits.PhotoMechanicPlus", "com.camerabits.PhotoMechanic"}
      set launched to false
      repeat with bid in pmBundles
        try
          do shell script "open -b " & quoted form of bid & " " & quoted form of thePath
          set launched to true
          exit repeat
        end try
      end repeat
      if not launched then
        error "Photo Mechanic isn't installed."
      end if
    `);

    await showToast({ style: Toast.Style.Success, title: "Opened in Photo Mechanic" });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't send to Photo Mechanic",
      message: String(error),
    });
  }
}
