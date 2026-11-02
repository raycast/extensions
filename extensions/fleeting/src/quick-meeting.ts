import { getPreferenceValues, open, showHUD } from "@raycast/api";
import { getMeeting } from "./data/meetings";
import { meetingUrl, randomMeetingId, resolveMeetingId } from "./lib/urls";

export default async function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const id = prefs.quickLaunchMode === "random" ? randomMeetingId() : resolveMeetingId(prefs.preferredMeeting);
  try {
    await open(meetingUrl(id));
    await showHUD(`Opening ${getMeeting(id).title}`);
  } catch {
    await showHUD("Could not open the browser");
  }
}
