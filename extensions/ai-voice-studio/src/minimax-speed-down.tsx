import { showHUD } from "@raycast/api";
import {
  SPEED_MIN,
  SPEED_NORMAL,
  SPEED_STEP,
  adjustSpeed,
  formatSpeed,
  getSpeedOverride,
} from "./utils/minimax-playback-state";

export default async function SpeedDown() {
  await runMinimaxSpeedDown();
}

export async function runMinimaxSpeedDown() {
  const before = (await getSpeedOverride()) ?? SPEED_NORMAL;
  const next = await adjustSpeed(-SPEED_STEP, SPEED_NORMAL);

  if (Math.abs(next - before) < 0.001 && next <= SPEED_MIN) {
    await showHUD(`Already at minimum speed (${formatSpeed(SPEED_MIN)})`);
    return;
  }

  await showHUD(`Speed ${formatSpeed(next)} · applies to the next playback`);
}
