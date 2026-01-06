import { showHUD, Clipboard, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { getMeetTab, openMeetTabDefaultProfile } from "./helpers";

export default async function main() {
  const { timeout: prefTimeout } = getPreferenceValues<{ timeout: string }>();

  const regexp = /^[0-9]+$/;
  const timeout = regexp.test(prefTimeout) ? parseInt(prefTimeout) : 500;

  try {
    await openMeetTabDefaultProfile();
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
