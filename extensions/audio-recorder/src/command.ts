import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { control } from "./bridge";
export async function run(action: string) {
  try {
    const status = await control(action);
    const messages: Record<string, string> = {
      start: "Starting recording — check the menu bar",
      pause: "Recording paused",
      resume: "Recording resumed",
      stop: "Saving recording…",
    };
    await showHUD(messages[action] || status.state);
  } catch (error) {
    await showFailureToast(error, { title: "Audio Recorder" });
  }
}
