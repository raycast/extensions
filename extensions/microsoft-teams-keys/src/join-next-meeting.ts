import { showHUD } from "@raycast/api";
import { pickMeetingToJoin, teamsMeetings } from "./lib/calendar";
import { report } from "./lib/meeting";
import { TeamsError, openInTeams } from "./lib/teams";

export default async function Command() {
  try {
    const now = new Date();
    // Long meetings that started hours ago still count, so look back a day.
    const meetings = await teamsMeetings(new Date(now.getTime() - 86_400_000), new Date(now.getTime() + 3_600_000));
    const meeting = pickMeetingToJoin(meetings, now);
    if (!meeting) {
      throw new TeamsError("No Teams meeting is running or starts in the next 15 minutes.");
    }
    await openInTeams(meeting.link);
    await showHUD(`Joining ${meeting.title}`);
  } catch (error) {
    await report(error, "Could not join a meeting");
  }
}
