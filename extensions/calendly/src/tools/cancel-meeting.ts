import { Action, Tool } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { cancelMeeting } from "../api/meetings";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Scheduled event URI or UUID returned by List Meetings. */
  meeting: string;
  /** Human-readable meeting name, used only in the confirmation. */
  meetingName?: string;
  /** Optional cancellation reason sent to Calendly. */
  reason?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  style: Action.Style.Destructive,
  message: `Cancel ${input.meetingName ?? "this Calendly meeting"}? Invitees will be notified.`,
  info: [
    { name: "Meeting", value: input.meetingName ?? input.meeting },
    { name: "Reason", value: input.reason },
  ],
});

async function tool(input: Input) {
  await cancelMeeting(input.meeting, input.reason);
  return { canceled: true, meeting: input.meeting };
}

export default withAccessToken(calendlyOAuth)(tool);
