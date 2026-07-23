import { Toast, showToast } from "@raycast/api";
import { toggleAudioInputLock } from "./airbuddy";
import { showFailure } from "./feedback";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Audio Input Lock…" });

  try {
    // AirBuddy exposes no readable property for this setting anywhere in the sdef — unlike
    // listening mode or Spatial Audio, there's no postcondition to poll, so the toast CANNOT claim
    // a resulting On/Off state without risking a lie: the lock could equally be toggled from
    // AirBuddy's own UI or a Shortcut between calls, silently desyncing any locally-tracked guess.
    await toggleAudioInputLock();

    toast.style = Toast.Style.Success;
    toast.title = "Audio Input Lock Toggled";
    toast.message = "Check AirBuddy to confirm the current state.";
  } catch (error) {
    await showFailure("Couldn't toggle Audio Input Lock", error);
  }
}
