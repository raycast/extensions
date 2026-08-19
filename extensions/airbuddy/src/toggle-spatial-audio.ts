import { Toast, showToast } from "@raycast/api";
import { getAppState, toggleSpatialAudio } from "./airbuddy";
import { failToast, showFailure } from "./feedback";
import { pollUntil } from "./poll";
import { SPATIAL_AUDIO_LABELS } from "./types";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Spatial Audio…" });

  try {
    const before = await getAppState();

    // Fail fast. With no audio output route, AirBuddy ACCEPTS the toggle and silently no-ops it
    // (verified: currentOutputDevice null, mode "off" before and after). Polling for a change
    // that can never come spins for the full timeout and then blames the extension — when the
    // real answer is "there's no headset to apply it to."
    if (!before.currentOutputName) {
      failToast(toast, "No audio output device", "Connect a headset before changing Spatial Audio.");
      return;
    }

    const previous = before.spatialAudioMode;

    await toggleSpatialAudio();

    const after = await pollUntil(
      () => getAppState(),
      (state) => state.spatialAudioMode !== previous,
      { description: "Spatial Audio never changed" },
    );

    toast.style = Toast.Style.Success;
    toast.title = SPATIAL_AUDIO_LABELS[after.spatialAudioMode];
  } catch (error) {
    await showFailure("Couldn't toggle Spatial Audio", error);
  }
}
