import { MonitorControl } from "./utils/monitor-control";

export default async function BrightnessUp() {
  const hasSupport = await MonitorControl.checkDDCSupport();
  if (!hasSupport) return;

  await MonitorControl.increaseBrightness(10);
}
