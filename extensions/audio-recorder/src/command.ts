import { showHUD, showToast, Toast } from "@raycast/api";
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
    await showToast({ style: Toast.Style.Failure, title: "Audio Recorder", message: (error as Error).message });
  }
}
