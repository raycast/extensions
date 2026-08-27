import { locationNeedsInviteeDetails } from "../lib/locations";
import { calendlyCollection, calendlyRequest, resourceId } from "./client";
import { CalendlyResourceResponse, CreatedInvitee, EventTypeLocation, Invitee, ScheduledEvent } from "./types";
import { getCurrentUser } from "./users";

interface ListMeetingsOptions {
  startTime: Date;
  endTime: Date;
  status?: "active" | "canceled";
}

export async function listMeetings({ startTime, endTime, status = "active" }: ListMeetingsOptions) {
  const user = await getCurrentUser();
  return calendlyCollection<ScheduledEvent>("/scheduled_events", {
    user: user.uri,
    status,
    min_start_time: startTime.toISOString(),
    max_start_time: endTime.toISOString(),
    sort: "start_time:asc",
    count: 100,
  });
}

export async function getMeeting(uriOrId: string) {
  const id = resourceId(uriOrId, "scheduled_events");
  const { resource } = await calendlyRequest<CalendlyResourceResponse<ScheduledEvent>>(`/scheduled_events/${id}`);
  return resource;
}

export async function listInvitees(meetingUriOrId: string) {
  const id = resourceId(meetingUriOrId, "scheduled_events");
  return calendlyCollection<Invitee>(`/scheduled_events/${id}/invitees`, { count: 100, status: "active" });
}

export async function cancelMeeting(meetingUriOrId: string, reason?: string) {
  const id = resourceId(meetingUriOrId, "scheduled_events");
  await calendlyRequest(`/scheduled_events/${id}/cancellation`, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

interface BookMeetingInput {
  eventTypeUri: string;
  startTime: string;
  name: string;
  email: string;
  timezone: string;
  location?: EventTypeLocation;
}

export async function bookMeeting(input: BookMeetingInput) {
  const names = input.name.trim().split(/\s+/);
  if (input.location && locationNeedsInviteeDetails(input.location) && !input.location.location?.trim()) {
    throw new Error(
      input.location.kind === "outbound_call"
        ? "This location requires the invitee's phone number."
        : "This location requires invitee-provided details.",
    );
  }

  const location = input.location
    ? {
        kind: input.location.kind,
        ...(input.location.location ? { location: input.location.location } : {}),
      }
    : undefined;

  const { resource } = await calendlyRequest<CalendlyResourceResponse<CreatedInvitee>>("/invitees", {
    method: "POST",
    body: JSON.stringify({
      event_type: input.eventTypeUri,
      start_time: input.startTime,
      invitee: {
        name: input.name,
        first_name: names[0],
        last_name: names.length > 1 ? names.slice(1).join(" ") : undefined,
        email: input.email,
        timezone: input.timezone,
      },
      ...(location ? { location } : {}),
    }),
  });
  return resource;
}
