import { getEvents } from "../api";

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

/**
 * Query the Fastly audit log: who did what and when on the account (service
 * changes, version activations, logins, token creation, etc.). Useful for
 * questions like "what changed on my account yesterday?".
 */
export default async function ({ eventType, serviceId, createdAfter }: Input) {
  const response = await getEvents({
    event_type: eventType,
    service_id: serviceId,
    created_at_start: createdAfter,
    per_page: 50,
  });

  return (response.data || []).map((event) => ({
    id: event.id,
    event_type: event.attributes.event_type,
    description: event.attributes.description,
    created_at: event.attributes.created_at,
    service_id: event.attributes.service_id,
    user_id: event.attributes.user_id,
    ip: event.attributes.ip,
  }));
}
