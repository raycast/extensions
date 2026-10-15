import { getPreferenceValues, open } from "@raycast/api";
import { MeetingId, getMeeting, isMeetingId } from "../data/meetings";
import { meetingUrl, randomMeetingId, resolveMeetingId } from "../lib/urls";

type Input = {
  /** A meeting ID from list-meetings, 'preferred', 'random', or 'quick' to follow Quick Meeting preferences. Defaults to 'quick'. */
  meeting?: string;
};

/** Opens a fictional Fleeting meeting in the browser. */
export default async function tool(input: Input) {
  const prefs = getPreferenceValues<Preferences>();
  const selection = input.meeting ?? "quick";
  let id: MeetingId;
  if (selection === "random" || (selection === "quick" && prefs.quickLaunchMode === "random")) {
    id = randomMeetingId();
  } else if (selection === "preferred" || selection === "quick") {
    id = resolveMeetingId(prefs.preferredMeeting);
  } else {
    if (!isMeetingId(selection)) throw new Error(`Unknown meeting ID: ${selection}. Use list-meetings to find an ID.`);
    id = selection;
  }
  const url = meetingUrl(id);
  await open(url);
  return { status: "opened", meetingId: id, title: getMeeting(id).title, url };
}
