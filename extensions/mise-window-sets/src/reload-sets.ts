import { closeMainWindow, open, showHUD, showToast, Toast } from "@raycast/api";
import { reloadSetsURL } from "./sets";

export default async function Command() {
  try {
    await open(reloadSetsURL());
    await closeMainWindow({ clearRootSearch: true });
    await showHUD("Mise: reloading Sets");
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to reload Sets",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
