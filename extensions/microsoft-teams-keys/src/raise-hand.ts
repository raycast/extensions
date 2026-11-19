import { report, runMeetingAction } from "./lib/meeting";

export default async function Command() {
  try {
    await runMeetingAction("hand");
  } catch (error) {
    await report(error, "Teams did not get the shortcut");
  }
}
