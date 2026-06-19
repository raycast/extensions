import { openExtensionPreferences, showHUD, showToast, Toast } from "@raycast/api";
import { BinaryNotFoundError, startFloating } from "./pixtuoid";

export default async function StartFloating() {
  try {
    await startFloating();
    await showHUD("🪟 Opening the Pixtuoid floating window…");
  } catch (e) {
    if (e instanceof BinaryNotFoundError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Pixtuoid not found",
        message: "Set the binary path in extension preferences.",
      });
      await openExtensionPreferences();
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't start the floating window",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
