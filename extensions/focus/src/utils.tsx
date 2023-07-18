import { getApplications } from "@raycast/api";
import { runAppleScript } from "run-applescript";

export async function getInstallStatus() {
  const applications = await getApplications();
  return applications.some(
    ({ bundleId }) => bundleId === "BradJasper.focus" || bundleId === "com.bradjasper.focus-setapp"
  );
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
  await runAppleScript('do shell script "open focus://unfocus"');
}

export async function openPreferences() {
  await runAppleScript('do shell script "open focus://preferences"');
}
