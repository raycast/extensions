import { checkSchedule } from "../status";
import { getCaffeinationState, deviceName, sleepCaveat, SessionPrevention } from "../utils";

/** Reports Coffee's session and any detected external caffeinate processes. */
export default async function () {
  await checkSchedule();
  const state = await getCaffeinationState();
  const externalSummary = `${state.externalCount} ${state.externalCount === 1 ? "process" : "processes"}`;
  if (state.isManaged) {
    const external = state.externalCount ? `; external caffeination is also active (${externalSummary})` : "";
    return `${describeSession(state.prevention)}${external}`;
  }
  if (state.externalCount) {
    return `Coffee is inactive; external caffeination is active (${externalSummary})`;
  }
  return `Coffee is inactive; ${state.externalCount === null ? "external sleep prevention is not monitored on Windows" : "no caffeinate processes were detected"}`;
}

function describeSession(prevention?: SessionPrevention): string {
  // Sessions started before Coffee saved what they prevent.
  if (!prevention) return "Coffee is active";
  const caveat = sleepCaveat(prevention);
  return caveat ? `Coffee is active, but ${caveat}` : `Coffee is currently keeping your ${deviceName()} awake`;
}
