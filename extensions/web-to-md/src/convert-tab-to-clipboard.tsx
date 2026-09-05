import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { getActiveTabContent } from "./lib/active-tab";
import { runConversionToHud } from "./lib/run-conversion";

export default async function ConvertTabToClipboard() {
  const preferences = getPreferenceValues<Preferences>();
  try {
    const tab = await getActiveTabContent();
    await runConversionToHud({
      url: tab.url,
      html: tab.html,
      destination: "clipboard",
      preferences,
    });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read active tab",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
