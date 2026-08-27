import { Action, Tool } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { cancelMeeting, getMeeting } from "../api/meetings";
import { formatDateTime } from "../lib/dates";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Scheduled event URI or UUID returned by List Meetings. */
  meeting: string;
  /** Optional cancellation reason sent to Calendly. */
  reason?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const meeting = await getMeeting(input.meeting);
  return {
    style: Action.Style.Destructive,
    message: `Cancel ${meeting.name}? Invitees will be notified.`,
    info: [
      { name: "Meeting", value: meeting.name },
      { name: "Start", value: formatDateTime(meeting.start_time) },
      { name: "Reason", value: input.reason },
    ],
  };
};

async function tool(input: Input) {
  await cancelMeeting(input.meeting, input.reason);
  return { canceled: true, meeting: input.meeting };
}

export default withAccessToken(calendlyOAuth)(tool);
