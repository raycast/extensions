import { showHUD } from "@raycast/api";
import { startTimer } from "./timer-state";
import { getPresets } from "./utils";

export default async function Command() {
  const presets = await getPresets();
  const preset = presets[3];
  if (!preset) {
    await showHUD("⚠️ Preset 4 is not configured");
    return;
  }
  startTimer({
    totalSeconds: preset.seconds,
    label: preset.label,
    note: "",
    soundFile: "alert.wav",
    volume: 75,
    alertDuration: 0,
  });
  await showHUD(`▶ ${preset.label} started`);
}
