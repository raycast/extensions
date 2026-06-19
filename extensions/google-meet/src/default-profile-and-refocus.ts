import { showHUD, Clipboard } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getMeetTab, openMeetTabDefaultProfile, getTimeout, sleep, switchToPreviousApp } from "./helpers";

export default async function main() {
  try {
    await openMeetTabDefaultProfile();

    const timeout = getTimeout();
    await sleep(timeout);

    const meetTab = await getMeetTab();

    await Clipboard.copy(meetTab);
    await showHUD("Copied meet link to clipboard");

    await switchToPreviousApp();
  } catch {
    await showFailureToast("Failed to create meet link. Make sure your browser is supported and try again.");
  }
}
