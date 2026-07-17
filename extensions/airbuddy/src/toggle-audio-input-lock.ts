import { Toast, showToast } from "@raycast/api";
import { toggleAudioInputLock } from "./airbuddy";
import { showFailure } from "./feedback";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Audio Input Lock…" });

  try {
    // AirBuddy exposes no readable property for this setting anywhere in the sdef — unlike
    // listening mode or Spatial Audio, there's no postcondition to poll. The command either
    // succeeds or throws; a generic confirmation is the most honest toast available.
    await toggleAudioInputLock();

    toast.style = Toast.Style.Success;
    toast.title = "Audio Input Lock Toggled";
  } catch (error) {
    await showFailure("Couldn't toggle Audio Input Lock", error);
  }
}
