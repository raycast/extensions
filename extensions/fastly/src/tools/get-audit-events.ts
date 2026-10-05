import { getEvents } from "../api";
import { AuditEvent } from "../types";

type Input = {
  /**
   * Filter by event type, e.g. "version.activate", "service.create",
   * "user.login", "token.create". Omit to see all event types.
   */
  eventType?: string;
  /** Filter to events affecting a single service ID */
  serviceId?: string;
  /** Only return events created after this ISO 8601 timestamp */
  createdAfter?: string;
};

// Read up to 4 pages of 50; the result says when more events matched
const MAX_PAGES = 4;

/**
 * Query the Fastly audit log: who did what and when on the account (service
 * changes, version activations, logins, token creation, etc.). Useful for
 * questions like "what changed on my account yesterday?". The result includes
 * total_matching; when truncated is true, tell the user the list is partial.
 */
export default async function ({ eventType, serviceId, createdAfter }: Input) {
  const events: AuditEvent[] = [];
  let totalMatching = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await getEvents({
      event_type: eventType,
      service_id: serviceId,
      created_at_start: createdAfter,
      page,
      per_page: 50,
    });
    events.push(...(response.data || []));
    totalMatching = response.meta?.record_count ?? events.length;
    if (page >= (response.meta?.total_pages ?? 1)) {
      break;
    }
  }

  return {
    total_matching: totalMatching,
    returned: events.length,
    truncated: events.length < totalMatching,
    events: events.map((event) => ({
      id: event.id,
      event_type: event.attributes.event_type,
      description: event.attributes.description,
      created_at: event.attributes.created_at,
      service_id: event.attributes.service_id,
      user_id: event.attributes.user_id,
      ip: event.attributes.ip,
    })),
  };
}
