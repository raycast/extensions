import { MeetingAction, meetingClient, UpdateMessage } from "./teams/meetingClient";
import { showHUD } from "@raycast/api";

export async function directCommand(
  action: MeetingAction,
  hudTitle: (msg: UpdateMessage) => string,
  hudErrorTitle = "No Meeting"
) {
  const client = await meetingClient();
  try {
    const state = await client.sendActionAndRequestMeetingState(action);
    await showHUD(hudTitle(state));
  } catch (error) {
    await showHUD(hudErrorTitle);
  }
}
