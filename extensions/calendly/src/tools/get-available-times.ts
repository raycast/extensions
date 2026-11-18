import { withAccessToken } from "@raycast/utils";

import { listAvailableTimes } from "../api/event-types";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Event type URI returned by List Event Types. */
  eventTypeUri: string;
  /** Inclusive range start in ISO 8601 format. */
  startTime: string;
  /** Exclusive range end in ISO 8601 format. Calendly accepts at most 7 days per request. */
  endTime: string;
}

async function tool(input: Input) {
  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  if (!Number.isFinite(startTime.getTime()) || !Number.isFinite(endTime.getTime())) {
    throw new Error("startTime and endTime must be valid ISO 8601 dates.");
  }
  if (endTime <= startTime) throw new Error("endTime must be after startTime.");
  if (endTime.getTime() - startTime.getTime() > 7 * 24 * 60 * 60 * 1000) {
    throw new Error("Calendly availability requests cannot span more than 7 days.");
  }

  const times = await listAvailableTimes(input.eventTypeUri, startTime, endTime);
  return times
    .filter((time) => time.status === "available")
    .map((time) => ({
      startTime: time.start_time,
      inviteesRemaining: time.invitees_remaining,
      schedulingUrl: time.scheduling_url,
    }));
}

export default withAccessToken(calendlyOAuth)(tool);
