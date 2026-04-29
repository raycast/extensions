import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { getActiveTab } from "./lib/active-tab";
import { runConversionToHud } from "./lib/run-conversion";
import type { CommandPreferences } from "./lib/types";

export default async function ConvertTabToFile() {
  const preferences = getPreferenceValues<CommandPreferences>();
  try {
    const tab = await getActiveTab();
    await runConversionToHud({
      url: tab.url,
      destination: "file",
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
