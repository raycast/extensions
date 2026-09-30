import { showHUD } from "@raycast/api";
import {
  SPEED_MAX,
  SPEED_NORMAL,
  SPEED_STEP,
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
} from "./utils/qwen-playback-state";

export default async function SpeedUp() {
  await runQwenSpeedUp();
}

export async function runQwenSpeedUp() {
  const before = (await getSpeedOverride()) ?? SPEED_NORMAL;
  const next = await adjustSpeed(SPEED_STEP, SPEED_NORMAL);

  if (Math.abs(next - before) < 0.001 && next >= SPEED_MAX) {
    await showHUD(`Already at maximum speed (${formatSpeed(SPEED_MAX)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
