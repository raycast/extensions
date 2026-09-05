import { withAccessToken } from "@raycast/utils";

import { getMeeting, listInvitees } from "../api/meetings";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Scheduled event URI or UUID returned by List Meetings. */
  meeting: string;
}

async function tool(input: Input) {
  const [meeting, invitees] = await Promise.all([getMeeting(input.meeting), listInvitees(input.meeting)]);
  return {
    uri: meeting.uri,
    name: meeting.name,
    status: meeting.status,
    startTime: meeting.start_time,
    endTime: meeting.end_time,
    eventTypeUri: meeting.event_type,
    location: meeting.location,
    hosts: meeting.event_memberships,
    invitees: invitees.map((invitee) => ({
      uri: invitee.uri,
      name: invitee.name,
      email: invitee.email,
      status: invitee.status,
      timezone: invitee.timezone,
      rescheduleUrl: invitee.reschedule_url,
      cancelUrl: invitee.cancel_url,
    })),
  };
}

export default withAccessToken(calendlyOAuth)(tool);
