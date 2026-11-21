import { showHUD } from "@raycast/api";
import { showFailure } from "./lib/app";
import { health, isNothingRecording, RecordistUnreachableError, stopRecording } from "./lib/recordist";

const STOPPED = "Recording stopped. Recordist is writing it up";

export default async function Command() {
  try {
    await stopRecording();
    await showHUD(STOPPED);
  } catch (err) {
    if (isNothingRecording(err)) {
      await showHUD("Nothing is recording");
      return;
    }
    // Recordist answers a stop once the last of the transcript is written, which can outlast the wait. The recording
    // itself ends at once, so if Recordist now says nothing records, the stop worked.
    if (err instanceof RecordistUnreachableError && err.timedOut) {
      const now = await health().catch(() => null);
      if (now?.recording && now.recording.active === false) {
        await showHUD(STOPPED);
        return;
      }
    }
    await showFailure(err);
  }
}
