import { showHUD, showToast, Toast } from "@raycast/api";
import { toggleCapsLock } from "swift:../swift/caps-lock";

export default async function Command() {
  let state: boolean;
  try {
    state = await toggleCapsLock();
    if (typeof state !== "boolean") {
      throw new Error("macOS did not return a confirmed Caps Lock state");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not toggle Caps Lock",
      message: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const title = `Caps Lock ${state ? "On" : "Off"}`;
  try {
    // showHUD also hides the main window. A display failure must not imply
    // the confirmed state change failed and encourage another toggle.
    await showHUD(title);
  } catch (error) {
    console.error("Caps Lock changed, but Raycast could not show the HUD", error);
    await showToast({
      style: Toast.Style.Success,
      title,
      message: "Caps Lock changed, but Raycast could not show the HUD.",
    });
  }
}
