import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type ProfileSlot = "profile1" | "profile2" | "profile3" | "profile4" | "profile5";

type Preferences = Record<ProfileSlot, string | undefined>;

const execFileAsync = promisify(execFile);

// ponytail: English Safari menu labels only; add localized labels if non-English macOS support is needed.
const openSafariProfile = (profileName: string) =>
  execFileAsync("/usr/bin/osascript", [
    "-e",
    `
      on run argv
        set menuItemName to "New " & item 1 of argv & " Window"
        if application "Safari" is not running then tell application "Safari" to launch
        tell application "System Events"
          tell process "Safari"
            tell menu "File" of menu bar 1
              if not (exists menu item menuItemName) then
                error "Safari does not have a profile named " & item 1 of argv & ". Check the profile name in Raycast settings."
              end if
              click menu item menuItemName
            end tell
            -- Activate only after the new window exists so macOS stays in the current Space.
            set frontmost to true
          end tell
        end tell
      end run
    `,
    "--",
    profileName,
  ]);

export async function openConfiguredProfile(slot: ProfileSlot): Promise<void> {
  const profileName = getPreferenceValues<Preferences>()[slot]?.trim();

  if (!profileName) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Profile slot is not configured",
      message: `Configure Profile Slot ${slot.at(-1)} in Raycast extension settings.`,
    });
    return;
  }

  try {
    await Promise.all([closeMainWindow(), openSafariProfile(profileName)]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open Safari profile “${profileName}”`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
