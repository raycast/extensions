import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { getMeetTab, openMeetTabDefaultProfile, switchToPreviousApp } from "./helpers";

export default async function main() {
  try {
    await openMeetTabDefaultProfile();
    const meetTab = await getMeetTab();

    await Clipboard.copy(meetTab);
    await showHUD("Copied meet link to clipboard");

    await switchToPreviousApp();
  } catch (_err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't copy to clipboard.",
    });
  }
}
