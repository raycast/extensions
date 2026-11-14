import { openExtensionPreferences, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { BinaryNotFoundError, predatesFloatingLaunch, startFloating } from "./pixtuoid";

export default async function StartFloating() {
  try {
    await startFloating();
    await showHUD("🪟 Opening the Pixtuoid floating window…");
  } catch (e) {
    if (e instanceof BinaryNotFoundError) {
      await showFailureToast(e, {
        title: "Pixtuoid not found",
        message: "Set the binary path in extension preferences.",
      });
      await openExtensionPreferences();
    } else if (predatesFloatingLaunch(e)) {
      await showFailureToast(e, {
        title: "Pixtuoid is out of date",
        message: "Update pixtuoid to start the floating window from Raycast.",
      });
    } else {
      await showFailureToast(e, { title: "Couldn't start the floating window" });
    }
  }
}
