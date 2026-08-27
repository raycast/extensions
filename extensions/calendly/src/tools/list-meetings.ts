import { withAccessToken } from "@raycast/utils";

import { listMeetings } from "../api/meetings";
import { endOfRange } from "../lib/dates";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Inclusive range start in ISO 8601 format. Defaults to now. */
  startTime?: string;
  /** Exclusive range end in ISO 8601 format. Defaults to 30 days after startTime. */
  endTime?: string;
  /** Whether to list active or canceled meetings. Defaults to active. */
  status?: "active" | "canceled";
}

async function tool(input: Input) {
  const startTime = input.startTime ? new Date(input.startTime) : new Date();
  const endTime = input.endTime ? new Date(input.endTime) : endOfRange(startTime, 30);
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) {
    throw new Error("startTime and endTime must be valid ISO 8601 dates.");
  }
  if (endTime <= startTime) throw new Error("endTime must be after startTime.");

  const meetings = await listMeetings({ startTime, endTime, status: input.status });
  return meetings.map((meeting) => ({
    uri: meeting.uri,
    name: meeting.name,
    status: meeting.status,
    startTime: meeting.start_time,
    endTime: meeting.end_time,
    eventTypeUri: meeting.event_type,
    location: meeting.location,
    hosts: meeting.event_memberships,
  }));
}

export default withAccessToken(calendlyOAuth)(tool);
