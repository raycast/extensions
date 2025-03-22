import { MeetingAction, asyncMeetingClient, UpdateMessage } from "./teams/meetingClient";
import { showHUD } from "@raycast/api";

export async function directCommand(
  action: MeetingAction,
  hudTitle?: (msg: UpdateMessage) => string,
  hudErrorTitle = "No Meeting"
) {
  const onError = () => {
    showHUD("Cannot connect to Microsoft Teams");
  };
  const client = await asyncMeetingClient(onError);
  try {
    const state = await client.sendActionAndRequestMeetingState(action);
    if (hudTitle) {
      await showHUD(hudTitle(state));
    }
  } catch (error) {
    await showHUD(hudErrorTitle);
  }
}
