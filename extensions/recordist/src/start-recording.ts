import { getPreferenceValues, showHUD } from "@raycast/api";
import { showFailure } from "./lib/app";
import { askToRecord, health, isAlreadyRecording, RecordistApiError, startRecording } from "./lib/recordist";

/** Why Recordist showed no card, as it says from version 1.0.5. */
const NO_CARD: Record<string, string> = {
  recording: "Recordist is already recording",
  starting: "Recordist is starting a recording",
  auto_recording: "Recordist is starting a recording",
  finishing: "Recordist is writing up the last call. Try again in a moment",
};

/**
 * Consent first. The command starts a recording at once only when Recordist itself allows other programs to start one
 * ("Allow agents to start recordings", off by default) and the person has not asked to be asked first. Otherwise it
 * brings up Recordist's own card, and nothing records until the person answers it there.
 */
export default async function Command() {
  const { alwaysAsk } = getPreferenceValues<Preferences.StartRecording>();
  try {
    const state = await health();
    if (state.recording?.active) {
      await showHUD("Recordist is already recording");
      return;
    }
    if (!alwaysAsk && state.allow_remote_start === true) {
      try {
        await startRecording();
        await showHUD("Recording");
        return;
      } catch (err) {
        if (isAlreadyRecording(err)) {
          await showHUD("Recordist is already recording");
          return;
        }
        // Recordist refused to start (the setting changed a moment ago, or the organisation turned it off): ask instead.
        if (!(err instanceof RecordistApiError && err.status === 403)) throw err;
      }
    }
    const answer = await askToRecord();
    if (answer.prompt_id) {
      await showHUD("Recordist is asking. Answer its card to start recording");
      return;
    }
    await showHUD(NO_CARD[answer.reason ?? ""] ?? "Recordist did not show its card. Start the recording in Recordist");
  } catch (err) {
    await showFailure(err);
  }
}
