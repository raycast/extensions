import { report, runMeetingAction } from "./lib/meeting";

export default async function Command() {
  try {
    await runMeetingAction("camera");
  } catch (error) {
    await report(error, "Teams did not get the shortcut");
  }
}
