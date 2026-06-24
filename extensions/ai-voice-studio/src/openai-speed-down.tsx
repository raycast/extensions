import { showHUD } from "@raycast/api";
import {
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
  SPEED_MIN,
  SPEED_NORMAL,
  SPEED_STEP,
} from "./utils/openai-playback-state";

export default async function SpeedDown() {
  await runOpenAISpeedDown();
}

export async function runOpenAISpeedDown() {
  const before = (await getSpeedOverride()) ?? SPEED_NORMAL;
  const next = await adjustSpeed(-SPEED_STEP, SPEED_NORMAL);

  if (Math.abs(next - before) < 0.001 && next <= SPEED_MIN) {
    await showHUD(`Already at minimum speed (${formatSpeed(SPEED_MIN)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
