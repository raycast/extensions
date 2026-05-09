import { showHUD } from "@raycast/api";
import {
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
  parseRateString,
  SPEED_MIN,
  SPEED_STEP,
} from "./utils/openai-playback-state";
import { getOpenAISettings } from "./utils/provider-settings";

export default async function SpeedDown() {
  await runOpenAISpeedDown();
}

export async function runOpenAISpeedDown() {
  const settings = await getOpenAISettings();
  const fallback = parseRateString(settings.playbackRate);
  const before = (await getSpeedOverride()) ?? fallback;
  const next = await adjustSpeed(-SPEED_STEP, fallback);

  if (Math.abs(next - before) < 0.001 && next <= SPEED_MIN) {
    await showHUD(`Already at minimum speed (${formatSpeed(SPEED_MIN)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
