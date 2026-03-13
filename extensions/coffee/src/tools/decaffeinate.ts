import { stopCaffeinate, getSchedule } from "../utils";

/**
 * Turns off caffeination, allowing your Mac to go to sleep normally
 */
export default async function () {
  const schedule = await getSchedule();
  if (schedule?.IsRunning) {
    throw new Error("Cannot decaffeinate while a schedule is running. Please pause the schedule first.");
  }

  await stopCaffeinate({ menubar: true, status: true }, undefined);

  return "Mac sleep prevention has been disabled";
}
