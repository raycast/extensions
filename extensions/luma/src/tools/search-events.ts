import { fetchSearchEvents, getEventUrl } from "../utils";

type Input = {
  /**
   * The search query to find events. This can be a keyword, topic, location name, or event type.
   * Examples: "AI", "design", "Tokyo", "hackathon", "networking"
   */
  query: string;
};

/**
 * Search for Luma events by keyword. Use this to find events matching a topic, location, or interest.
 * Returns raw event data with details including name, date, location, organizer, and ticket status.
 */
export default async function searchEvents(input: Input): Promise<string> {
  const data = await fetchSearchEvents(input.query);
  const events = data.entries || [];

  if (events.length === 0) {
    return `No events found for "${input.query}".`;
  }

  return JSON.stringify(
    {
      query: input.query,
      total: events.length,
      events: events.map((entry) => ({
        name: entry.event.name,
        url: getEventUrl(entry),
        startAt: entry.event.start_at,
        timezone: entry.event.timezone,
        locationType: entry.event.location_type,
        location: entry.event.geo_address_info?.city_state || entry.event.geo_address_info?.city || "Virtual Event",
        organizer: {
          name: entry.calendar.name,
          slug: entry.calendar.slug,
        },
        hosts: entry.hosts.map((h) => ({
          name: h.name,
          bio: h.bio_short,
        })),
        ticketInfo: {
          isFree: entry.ticket_info.is_free,
          isSoldOut: entry.ticket_info.is_sold_out,
          isNearCapacity: entry.ticket_info.is_near_capacity,
          requireApproval: entry.ticket_info.require_approval,
          spotsRemaining: entry.ticket_info.spots_remaining,
          price: entry.ticket_info.price,
          maxPrice: entry.ticket_info.max_price,
        },
        guestCount: entry.guest_count,
        coverUrl: entry.event.cover_url,
      })),
    },
    null,
    2,
  );
}
