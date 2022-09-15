import { getMeetTab, openMeetTab } from "./helpers";

import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Creating meeting...",
    });

    await openMeetTab();

    const meetTab = await getMeetTab();

    await Clipboard.copy(meetTab);
    await showHUD("Copied meet link to clipboard");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't copy to clipboard",
    });
  }
}
