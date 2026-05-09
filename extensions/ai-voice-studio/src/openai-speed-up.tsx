import { showHUD } from "@raycast/api";
import {
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
  parseRateString,
  SPEED_MAX,
  SPEED_STEP,
} from "./utils/openai-playback-state";
import { getOpenAISettings } from "./utils/provider-settings";

export default async function SpeedUp() {
  await runOpenAISpeedUp();
}

export async function runOpenAISpeedUp() {
  const settings = await getOpenAISettings();
  const fallback = parseRateString(settings.playbackRate);
  const before = (await getSpeedOverride()) ?? fallback;
  const next = await adjustSpeed(SPEED_STEP, fallback);

  if (Math.abs(next - before) < 0.001 && next >= SPEED_MAX) {
    await showHUD(`Already at maximum speed (${formatSpeed(SPEED_MAX)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
