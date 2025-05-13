import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";

import { getMeetTab, openMeetTabDefaultProfile } from "./helpers";
import { handleMeetLinkWithRefocus } from "./utils/scripts";

export default async function main() {
  try {
    await openMeetTabDefaultProfile();
    await new Promise((r) => setTimeout(r, 500));
    const meetTab = await getMeetTab();

    await handleMeetLinkWithRefocus(meetTab);
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't copy to clipboard",
    });
  }
}
