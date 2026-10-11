import { runControl } from "./run-control";

export default async function Command(): Promise<void> {
  await runControl("/calibration/cancel", "Cancel Calibration");
}
