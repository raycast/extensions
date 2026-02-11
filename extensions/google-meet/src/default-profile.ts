import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { getMeetTab, openMeetTabDefaultProfile, getTimeout } from "./helpers";

export default async function main() {
  try {
    await openMeetTabDefaultProfile();
    const meetTab = await getMeetTab();

    const timeout = getTimeout();
    await new Promise((r) => setTimeout(r, timeout));

    await Clipboard.copy(meetTab);
    await showHUD("Copied meet link to clipboard");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't copy to clipboard",
    });
  }
}
