import { stopCaffeinate, getSchedule } from "../utils";

/**
 * Turns off caffeination, allowing your PC to go to sleep normally
 */
export default async function () {
  const schedule = await getSchedule();
  if (schedule?.IsRunning) {
    throw new Error("Cannot decaffeinate while a schedule is running. Please pause the schedule first.");
  }

  await stopCaffeinate({ status: true }, undefined);

  return "PC sleep prevention has been disabled";
}
