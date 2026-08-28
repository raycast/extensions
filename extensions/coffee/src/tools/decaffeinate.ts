import { stopCaffeinate, getSchedule, deviceName } from "../utils";

/**
 * Turns off caffeination, allowing your computer to go to sleep normally
 */
export default async function () {
  const schedule = await getSchedule();
  if (schedule?.IsRunning) {
    throw new Error("Cannot decaffeinate while a schedule is running. Please pause the schedule first.");
  }

  await stopCaffeinate({ menubar: true, status: true }, undefined);

  return `${deviceName()} sleep prevention has been disabled`;
}
