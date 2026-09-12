import { klack } from "./klack";
import { runSilently } from "./run-silently";
import type { VolumePreset } from "./types";

export function presetVolumeCommand(preset: VolumePreset) {
  return async function Command() {
    await runSilently(async () => {
      if ((await klack.currentVolume()) === preset.value) {
        return `Volume is already at ${preset.label} (${preset.value}%)`;
      }
      await klack.setVolume(preset.value);
      return `Volume set to ${preset.label} (${preset.value}%)`;
    });
  };
}
