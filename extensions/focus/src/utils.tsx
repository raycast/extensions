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
  if (!(await isFocusRunning())) return;
  await runAppleScript('do shell script "open focus://focus"');
}

export async function startFocus25(): Promise<void> {
  if (!(await isFocusRunning())) return;
  await runAppleScript('do shell script "open focus://focus?minutes=25"');
}

export async function startFocusWithProfile25(profile: string): Promise<void> {
  if (!(await isFocusRunning())) return;
  await runAppleScript(`do shell script "open 'focus://focus?profile=${encodeURIComponent(profile)}&minutes=25'"`);
}

export async function startFocusCustom(hours?: number, minutes?: number, profile?: string): Promise<boolean> {
  if (!(await isFocusRunning())) return false;

  let totalSeconds = 0;
  if (hours !== undefined) {
    totalSeconds += hours * 60 * 60;
  }
  if (minutes !== undefined) {
    totalSeconds += minutes * 60;
  }

  if (totalSeconds === 0) {
    return false; // Return false if no duration is specified
  }

  let url = `focus://focus?seconds=${totalSeconds}`;

  if (profile) {
    url += `&profile=${encodeURIComponent(profile)}`;
  }

  await runAppleScript(`do shell script "open '${url}'"`);
  return true;
}

export async function takeBreak5() {
  if (!(await isFocusRunning())) return;
  await runAppleScript('do shell script "open focus://break?minutes=5"');
}

export async function takeBreakWithProfile5(profile: string) {
  if (!(await isFocusRunning())) return;
  await runAppleScript(`do shell script "open 'focus://break?profile=${encodeURIComponent(profile)}&minutes=5'"`);
}

export async function takeBreakCustom(minutes?: number): Promise<boolean> {
  if (!(await isFocusRunning())) return false;
  if (minutes === undefined || minutes <= 0) return false;
  const url = `focus://break?minutes=${minutes}`;
  await runAppleScript(`do shell script "open '${url}'"`);
  return true;
}

export async function takeBreakWithProfileCustom(profile: string, minutes?: number): Promise<boolean> {
  if (!(await isFocusRunning())) return false;
  if (minutes === undefined || minutes <= 0) return false;
  const url = `focus://break?profile=${encodeURIComponent(profile)}&minutes=${minutes}`;
  await runAppleScript(`do shell script "open '${url}'"`);
  return true;
}

export async function stopBreak() {
  if (!(await isFocusRunning())) return;
  await runAppleScript('do shell script "open focus://unbreak"');
}

export async function stopBreakWithProfile(profile: string) {
  if (!(await isFocusRunning())) return;
  await runAppleScript(`do shell script "open 'focus://unbreak?profile=${encodeURIComponent(profile)}'"`);
  await stopBreak();
}

export async function stopFocus() {
  if (!(await isFocusRunning())) return;
  const activeProfile = await getActiveProfileName();
  if (activeProfile) {
    await runAppleScript(`do shell script "open 'focus://unfocus?profile=${activeProfile}'"`);
  } else {
    await runAppleScript('do shell script "open focus://unfocus"');
  }
}

export async function openPreferences() {
  if (!(await isFocusRunning())) return;
  await runAppleScript('do shell script "open focus://preferences"');
}

export async function getProfileNames() {
  try {
    const profileNames = await runAppleScript(`
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
    return profileNames.split(", ").map((name) => name.trim());
  } catch (error) {
    return [];
  }
}

export async function startFocusWithProfile(profileName: string) {
  if (!(await isFocusRunning())) return;
  await runAppleScript(`do shell script "open 'focus://focus?profile=${encodeURIComponent(profileName)}'"`);
}

export async function isFocusRunning() {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return exists (process "Focus")
      end tell
    `);
    return result === "true";
  } catch (error) {
    console.error("Error checking if Focus is running:", error);
    return false;
  }
}

export async function isBreakRunning() {
  try {
    const result = await runAppleScript(`
      tell application "Focus"
        is breaking
      end tell
    `);
    return result === "true";
  } catch (error) {
    console.error("Error checking if break is running:", error);
    return false;
  }
}
