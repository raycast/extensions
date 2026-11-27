import { checkSchedule } from "../status";
import { getCaffeinationState, deviceName } from "../utils";

/** Reports Coffee's session and any detected external caffeinate processes. */
export default async function () {
  await checkSchedule();
  const state = await getCaffeinationState();
  const externalSummary = `${state.externalCount} ${state.externalCount === 1 ? "process" : "processes"}`;
  if (state.isManaged) {
    const external = state.externalCount ? `; external caffeination is also active (${externalSummary})` : "";
    return `Coffee is currently keeping your ${deviceName()} awake${external}`;
  }
  if (state.externalCount) {
    return `Coffee is inactive; external caffeination is active (${externalSummary})`;
  }
  return `Coffee is inactive; ${state.externalCount === null ? "external sleep prevention is not monitored on Windows" : "no caffeinate processes were detected"}`;
}
