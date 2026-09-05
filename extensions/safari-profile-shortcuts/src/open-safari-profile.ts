import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export type ProfileSlot = "profile1" | "profile2" | "profile3" | "profile4" | "profile5";

const execFileAsync = promisify(execFile);

// ponytail: English Safari menu labels only; add localized labels if non-English macOS support is needed.
const clickSafariProfileMenuItem = (profileName: string) =>
  execFileAsync("/usr/bin/osascript", [
    "-e",
    `
      on run argv
        set menuItemName to "New " & item 1 of argv & " Window"
        set launchedSafari to application "Safari" is not running
        if launchedSafari then tell application "Safari" to launch

        set maxAttempts to 1
        if launchedSafari then set maxAttempts to 100

        repeat maxAttempts times
          tell application "System Events"
            if exists process "Safari" then
              tell process "Safari"
                if exists menu item menuItemName of menu "File" of menu bar 1 then
                  click menu item menuItemName of menu "File" of menu bar 1
                  -- Activate only after the new window exists so macOS stays in the current Space.
                  set frontmost to true
                  return
                end if
              end tell
            end if
          end tell
          if launchedSafari then delay 0.1
        end repeat

        error "Safari does not have a profile named " & item 1 of argv & ". Check the profile name in Raycast settings."
      end run
    `,
    "--",
    profileName,
  ]);

export async function openSafariProfile(profileName: string): Promise<void> {
  try {
    await Promise.all([closeMainWindow(), clickSafariProfileMenuItem(profileName)]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Could not open Safari profile “${profileName}”`,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

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

  await openSafariProfile(profileName);
}
