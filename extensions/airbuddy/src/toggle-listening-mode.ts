import { Toast, showToast } from "@raycast/api";
import { type OutputDevice, getOutputDevice, toggleListeningMode } from "./airbuddy";
import { failToast, showFailure } from "./feedback";
import { pollUntil } from "./poll";
import { LISTENING_MODE_LABELS, type ListeningMode } from "./types";

export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Switching listening mode…" });

  try {
    // Target the OUTPUT ROUTE — the headset the user is actually listening to.
    //
    // An earlier version took `devices().find(d => supportsListeningMode(d) && d.connected)` — the
    // FIRST connected mode-capable device in a collection with no documented ordering. With two
    // headsets connected (say Beats and AirPods), that's a coin flip, and the command's own manifest
    // promises "the current headset". Worse, AirBuddy picks its own target for the bare command, so
    // the mode could flip on one headset while we polled the other and timed out reporting failure.
    const output = await getOutputDevice();

    if (!output || output.supportedListeningModes.length === 0) {
      failToast(toast, "No headset connected", "Connect a headset that supports listening modes.");
      return;
    }

    // Re-bind: TS does not carry the guard above into the closures below.
    const target: OutputDevice = output;
    const previous: ListeningMode = target.listeningMode;

    await toggleListeningMode(target.id);

    const after = await pollUntil(
      () => getOutputDevice(),
      (d) => d !== null && d.listeningMode !== previous,
      {
        description: `${target.name} never switched modes`,
      },
    );

    toast.style = Toast.Style.Success;
    toast.title = after ? LISTENING_MODE_LABELS[after.listeningMode] : "Listening mode changed";
  } catch (error) {
    await showFailure("Couldn't switch the listening mode", error);
  }
}
