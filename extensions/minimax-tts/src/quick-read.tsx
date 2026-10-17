import { showHUD } from "@raycast/api";
import { clearExternalStopRequest, stopExternalPlayback } from "./utils/audio-player";
import { getReadableText } from "./utils/text-source";
import { prepareReadingSession } from "./utils/reading-session";
import { playReadingSession } from "./utils/reading-runner";
import { buildDefaultOptionsFromPrefs } from "./utils/voice-preferences";
import { presentCommandError, showResumeSuggestion } from "./utils/errors";
import { clearPlaybackState, readPlaybackState } from "./utils/playback-state";

export default async function QuickRead() {
  // Toggle: if our afplay is already running, stop it and return.
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying) {
    await clearPlaybackState();
    await showHUD("Stopped");
    return;
  }

  clearExternalStopRequest();

  try {
    const readableText = await getReadableText();
    if (!readableText) {
      const lastState = await readPlaybackState();
      const lastSessionAvailable = lastState && (lastState.phase === "stopped" || lastState.phase === "playing");

      if (lastSessionAvailable) {
        await showResumeSuggestion(
          "Nothing to read",
          "Select text in the foreground app or copy it to the clipboard, then trigger Quick Read again.",
        );
      } else {
        await showResumeSuggestion(
          "Nothing to read",
          "Select text in the foreground app or copy it to the clipboard. You can also resume your last reading.",
        );
      }
      return;
    }

    const options = await buildDefaultOptionsFromPrefs();
    const { session, isResuming } = await prepareReadingSession(readableText.text, readableText.source, options);
    await playReadingSession(session, isResuming);
  } catch (error) {
    await presentCommandError(error, "Failed to read selection");
  }
}
