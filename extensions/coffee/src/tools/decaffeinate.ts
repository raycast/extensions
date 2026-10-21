import { stopCaffeinate, stoppedCaffeinationMessage, prepareUserStop } from "../utils";

/**
 * Stops Coffee-owned caffeination. External sleep prevention remains untouched.
 * If a schedule is running, behavior depends on "Decaffeinate pauses running schedules" preference.
 */
export default async function () {
  const decision = await prepareUserStop();
  if (!decision.allowed) throw new Error("Caffeination schedule running");
  const state = await stopCaffeinate({ menubar: true, status: true }, false, {
    pauseRunningSchedule: decision.pauseRunningSchedule,
  });
  return stoppedCaffeinationMessage(state, decision.pauseRunningSchedule);
}
