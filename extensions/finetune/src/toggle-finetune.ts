import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { isFineTuneAvailable, isFineTuneManagedToggleEnabled, setFineTuneEnabled } from "./utils/audio";

export default async function Command() {
  try {
    await closeMainWindow();
  } catch {
    // Command can still run if the main window can't be closed.
  }

  const available = await isFineTuneAvailable();
  if (!available) {
    await showToast({
      style: Toast.Style.Failure,
      title: "FineTune app not found",
      message: "Install FineTune in /Applications to use this toggle",
    });
    return;
  }

  const currentlyEnabled = await isFineTuneManagedToggleEnabled();
  const nextEnabled = !currentlyEnabled;
  const success = await setFineTuneEnabled(nextEnabled);

  if (!success) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Toggle failed",
      message: "Could not update FineTune state",
    });
    return;
  }

  await showHUD(nextEnabled ? "FineTune Enabled" : "FineTune Disabled");
}
