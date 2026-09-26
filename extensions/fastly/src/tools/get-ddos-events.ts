import { getDdosEvents } from "../api";

type Input = {
  /** Optionally filter events to a single service ID. Omit to see events across all services. */
  serviceId?: string;
  /** Only return events that started after this ISO 8601 timestamp, e.g. "2026-09-01T00:00:00Z" */
  from?: string;
};

/**
 * List recent DDoS attack events detected by Fastly DDoS Protection, with
 * request counts and start/end times. An event with no ended_at is still ongoing.
 */
export default async function ({ serviceId, from }: Input) {
  const response = await getDdosEvents({ serviceId, from, limit: 50 });
  return (response.data || []).map((event) => ({
    id: event.id,
    name: event.name,
    service_id: event.service_id,
    requests_detected: event.requests_detected,
    requests_allowed: event.requests_allowed,
    started_at: event.started_at,
    ended_at: event.ended_at,
    ongoing: !event.ended_at,
  }));
}
