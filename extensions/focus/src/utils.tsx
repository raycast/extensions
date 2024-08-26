import { getApplications } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function getInstallStatus() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) => bundleId === "BradJasper.focus" || bundleId === "com.bradjasper.focus-setapp"
  );
}

export async function getActiveProfileName() {
  try {
    const profileName = await runAppleScript(`
      tell application "Focus"
        try
          set profileName to active profile name
          if profileName is missing value then
            return ""
          else
            return profileName
          end if
        on error
          return ""
        end try
      end tell
    `);
    return profileName.trim();
  } catch (error) {
    console.error("Error in getActiveProfileName:", error);
    return "";
  }
}

export async function startFocus() {
  await runAppleScript('do shell script "open focus://focus"');
}

export async function startFocus25() {
  await runAppleScript('do shell script "open focus://focus?minutes=25"');
}

export async function startFocusCustom(hours?: number, minutes?: number) {
  let url = "focus://focus?";
  let totalSeconds = 0;

  if (hours !== undefined) {
    totalSeconds += hours * 60 * 60;
  }
  if (minutes !== undefined) {
    totalSeconds += minutes * 60;
  }

  if (totalSeconds > 0) {
    url += `seconds=${totalSeconds}`;
  }

  await runAppleScript(`do shell script "open ${url}"`);
}

export async function takeBreak5() {
  await runAppleScript('do shell script "open focus://break?minutes=5"');
}

export async function takeBreakCustom(minutes?: number) {
  await runAppleScript(`do shell script "open focus://break?minutes=${minutes}"`);
}

export async function stopBreak() {
  await runAppleScript('do shell script "open focus://unbreak"');
}

export async function stopFocus() {
  const activeProfile = await getActiveProfileName();
  if (activeProfile) {
    await runAppleScript(`do shell script "open 'focus://unfocus?profile=${activeProfile}'"`);
  } else {
    await runAppleScript('do shell script "open focus://unfocus"');
  }
}

export async function openPreferences() {
  await runAppleScript('do shell script "open focus://preferences"');
}

export async function getProfileNames() {
  try {
    let profileNames = await runAppleScript(`
      tell application "Focus"
        try
          return profile names
        on error
          try
            get profile names
          on error
            return ""
          end try
        end try
      end tell
    `);
    if (profileNames === "") {
      return [];
    }
    // If the result is a list, it will be comma-separated
    return profileNames.split(", ").map(name => name.trim());
  } catch (error) {
    return [];
  }
}

export async function startFocusWithProfile(profileName: string) {
  await runAppleScript(`do shell script "open 'focus://focus?profile=${profileName}'"`);
}