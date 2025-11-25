import { MonitorControl } from "./utils/monitor-control";

export default async function BrightnessDown() {
  const hasSupport = await MonitorControl.checkDDCSupport();
  if (!hasSupport) return;

  await MonitorControl.decreaseBrightness(10);
}
