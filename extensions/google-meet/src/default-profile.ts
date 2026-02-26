import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { getMeetTab, openMeetTabDefaultProfile, getTimeout, sleep } from "./helpers";

export default async function main() {
  try {
    await openMeetTabDefaultProfile();

    const timeout = getTimeout();
    await sleep(timeout);

    const meetTab = await getMeetTab();

    await Clipboard.copy(meetTab);
    await showHUD("Copied meet link to clipboard");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't copy to clipboard",
    });
  }
}
