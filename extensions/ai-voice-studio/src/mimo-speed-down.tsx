import { showHUD } from "@raycast/api";
import {
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
  parseRateString,
  SPEED_MIN,
  SPEED_STEP,
} from "./utils/mimo-playback-state";
import { getMimoSettings } from "./utils/provider-settings";

export default async function SpeedDown() {
  await runMimoSpeedDown();
}

export async function runMimoSpeedDown() {
  const settings = await getMimoSettings();
  const fallback = parseRateString(settings.speechRate);
  const before = (await getSpeedOverride()) ?? fallback;
  const next = await adjustSpeed(-SPEED_STEP, fallback);

  if (Math.abs(next - before) < 0.001 && next <= SPEED_MIN) {
    await showHUD(`Already at minimum speed (${formatSpeed(SPEED_MIN)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
