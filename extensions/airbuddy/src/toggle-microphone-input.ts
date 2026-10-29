import { Toast, showToast } from "@raycast/api";
import { getOutputDevice, toggleMicrophoneInput } from "./airbuddy";
import { failToast, showFailure } from "./feedback";
import { pollUntil } from "./poll";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Toggling Microphone Input…" });

  try {
    // Sdef: "rejected when no routed headset is available." Fail fast rather than dispatching a
    // doomed toggle and polling for a change that can never come — the same shape as Spatial Audio's
    // "no audio output route" guard.
    const before = await getOutputDevice();

    if (!before || !before.connected) {
      failToast(toast, "No headset connected", "Connect a headset before toggling microphone input.");
      return;
    }

    const wasInUse = before.audioState === "microphone in use";

    await toggleMicrophoneInput();

    await pollUntil(
      () => getOutputDevice(),
      (d) => d !== null && (d.audioState === "microphone in use") !== wasInUse,
      { description: `${before.name}'s microphone input never changed` },
    );

    toast.style = Toast.Style.Success;
    toast.title = wasInUse ? "Microphone Input Off" : "Microphone Input On";
  } catch (error) {
    await showFailure("Couldn't toggle microphone input", error);
  }
}
