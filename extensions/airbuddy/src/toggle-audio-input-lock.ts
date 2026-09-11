import { Toast, showToast } from "@raycast/api";
import { getAppState, toggleAudioInputLock } from "./airbuddy";
import { showFailure } from "./feedback";
import { pollUntil } from "./poll";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Audio Input Lock…" });

  try {
    // NEW in AirBuddy 913: `audioInputLockEnabled` is now a readable app-level property. Previously
    // this command had no postcondition at all, so the toast could only claim "Toggled" — now it
    // can report the real resulting state, the same way Spatial Audio and Microphone Input do.
    const before = await getAppState();
    const wasEnabled = before.audioInputLockEnabled;

    await toggleAudioInputLock();

    const after = await pollUntil(
      () => getAppState(),
      (state) => state.audioInputLockEnabled !== wasEnabled,
      {
        description: "Audio Input Lock never changed",
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = after.audioInputLockEnabled ? "Audio Input Lock On" : "Audio Input Lock Off";
  } catch (error) {
    await showFailure("Couldn't toggle Audio Input Lock", error);
  }
}
