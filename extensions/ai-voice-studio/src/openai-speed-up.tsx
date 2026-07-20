import { showHUD } from "@raycast/api";
import {
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
  SPEED_MAX,
  SPEED_NORMAL,
  SPEED_STEP,
} from "./utils/openai-playback-state";

export default async function SpeedUp() {
  await runOpenAISpeedUp();
}

export async function runOpenAISpeedUp() {
  const before = (await getSpeedOverride()) ?? SPEED_NORMAL;
  const next = await adjustSpeed(SPEED_STEP, SPEED_NORMAL);

  if (Math.abs(next - before) < 0.001 && next >= SPEED_MAX) {
    await showHUD(`Already at maximum speed (${formatSpeed(SPEED_MAX)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
