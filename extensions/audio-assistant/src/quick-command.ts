import { showHUD } from "@raycast/api";
import type { PlaybackAction } from "./domain/model";
import { createRuntimeAsync } from "./runtime";
import { reportError } from "./ui/feedback";

export async function runQuickCommand(action: PlaybackAction): Promise<void> {
  let runtime: Awaited<ReturnType<typeof createRuntimeAsync>> | undefined;
  try {
    runtime = await createRuntimeAsync();
    if (runtime.service.mode === "demo") {
      await showHUD("Demo mode: playback is simulated inside Music only");
      return;
    }
    await runtime.controller.playback(action);
    await showHUD("Audio Assistant: playback updated");
  } catch (error) {
    await reportError(error);
  } finally {
    runtime?.service.dispose();
  }
}
