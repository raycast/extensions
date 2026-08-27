import { calendlyRequest, resourceId } from "./client";
import {
  AvailableTime,
  CalendlyCollectionResponse,
  CalendlyResourceResponse,
  EventType,
  SchedulingLink,
} from "./types";
import { getCurrentUser } from "./users";

const AVAILABILITY_START_BUFFER_MS = 60_000;

export async function listEventTypes() {
  const user = await getCurrentUser();
  const { collection } = await calendlyRequest<CalendlyCollectionResponse<EventType>>("/event_types", {
    query: { user: user.uri, active: true, count: 100, sort: "name:asc" },
  });
  return collection;
}

export async function getEventType(uriOrId: string) {
  const id = resourceId(uriOrId, "event_types");
  const { resource } = await calendlyRequest<CalendlyResourceResponse<EventType>>(`/event_types/${id}`);
  return resource;
}

export async function listAvailableTimes(eventTypeUri: string, startTime: Date, endTime: Date) {
  const minimumStartTime = new Date(Date.now() + AVAILABILITY_START_BUFFER_MS);
  const effectiveStartTime = new Date(Math.max(startTime.getTime(), minimumStartTime.getTime()));
  if (endTime <= effectiveStartTime) {
    throw new Error("The availability range must end in the future after its start time.");
  }

  const { collection } = await calendlyRequest<CalendlyCollectionResponse<AvailableTime>>(
    "/event_type_available_times",
    {
      query: {
        event_type: eventTypeUri,
        start_time: effectiveStartTime.toISOString(),
        end_time: endTime.toISOString(),
      },
    },
  );
  return collection;
}

export async function createSingleUseLink(eventTypeUri: string) {
  const { resource } = await calendlyRequest<CalendlyResourceResponse<SchedulingLink>>("/scheduling_links", {
    method: "POST",
    body: JSON.stringify({ max_event_count: 1, owner: eventTypeUri, owner_type: "EventType" }),
  });
  return resource;
}
