import {
  LaunchProps,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  open,
  showToast,
} from "@raycast/api";
import { getSelectedTabbitApp, normalizeUrlOrSearch } from "./tabbit";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.OpenUrlInTabbit }>,
) {
  try {
    const target = props.arguments.url?.trim();
    const preferences = getPreferenceValues<Preferences.OpenUrlInTabbit>();

    await closeMainWindow();
    await open(
      target
        ? normalizeUrlOrSearch(target, preferences.searchEngine)
        : "https://web.tabbit-ai.com/newtab",
      getSelectedTabbitApp().bundleId,
    );
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open URL in Tabbit",
    });
  }
}
