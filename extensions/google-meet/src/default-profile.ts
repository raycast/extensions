import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { getMeetTab, openMeetTabDefaultProfile, Preferences, getTimeout } from "./helpers";

export default async function main() {
  const { timeout: prefTimeout } = getPreferenceValues<Preferences>();

  try {
    await openMeetTabDefaultProfile();

    const timeout = getTimeout(prefTimeout);
    await new Promise((r) => setTimeout(r, timeout));
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
