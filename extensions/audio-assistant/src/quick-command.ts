import { showHUD } from "@raycast/api";
import type { PlaybackAction } from "./domain/model";
import { createRuntime } from "./runtime";
import { reportError } from "./ui/feedback";

export async function runQuickCommand(action: PlaybackAction): Promise<void> {
  let runtime: ReturnType<typeof createRuntime> | undefined;
  try {
    runtime = createRuntime();
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

export async function runVolumeCommand(delta: number): Promise<void> {
  let runtime: ReturnType<typeof createRuntime> | undefined;
  try {
    runtime = createRuntime();
    if (runtime.service.mode === "demo") {
      await showHUD("Demo mode: volume control is simulated inside Music only");
      return;
    }
    const { player, newVolume } = await runtime.controller.stepVolume(delta);
    await showHUD(`${player.name}: Volume ${newVolume}%`);
  } catch (error) {
    await reportError(error);
  } finally {
    runtime?.service.dispose();
  }
}

export async function runToggleMuteCommand(): Promise<void> {
  let runtime: ReturnType<typeof createRuntime> | undefined;
  try {
    runtime = createRuntime();
    if (runtime.service.mode === "demo") {
      await showHUD("Demo mode: mute control is simulated inside Music only");
      return;
    }
    const { player, muted } = await runtime.controller.toggleMute();
    await showHUD(`${player.name}: ${muted ? "Muted" : "Unmuted"}`);
  } catch (error) {
    await reportError(error);
  } finally {
    runtime?.service.dispose();
  }
}
