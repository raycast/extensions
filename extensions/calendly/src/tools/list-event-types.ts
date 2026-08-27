import { withAccessToken } from "@raycast/utils";

import { listEventTypes } from "../api/event-types";
import { locationNeedsInviteeDetails } from "../lib/locations";
import { calendlyOAuth } from "../oauth/calendly";

async function tool() {
  const eventTypes = await listEventTypes();
  return eventTypes.map((eventType) => ({
    uri: eventType.uri,
    name: eventType.name,
    durationMinutes: eventType.duration,
    kind: eventType.kind,
    schedulingUrl: eventType.scheduling_url,
    locations: eventType.locations.map((location) => ({
      ...location,
      requiresInviteeDetails: locationNeedsInviteeDetails(location),
    })),
  }));
}

export default withAccessToken(calendlyOAuth)(tool);
