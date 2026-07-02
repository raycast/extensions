import { fetchBootstrapData, fetchPlaceEvents, getEventUrl } from "../utils";

type Input = {
  /**
   * The name or slug of the place/city to get events for.
   * Examples: "san-francisco", "tokyo", "london", "new-york", "taipei", "berlin"
   */
  place: string;
};

/**
 * Get upcoming events for a specific city or place on Luma.
 * Use this to find what events are happening in a particular location.
 * The place can be a city name or slug (e.g. "san-francisco", "tokyo", "taipei").
 * Returns raw event data that can be formatted by the AI.
 */
export default async function getPlaceEvents(input: Input): Promise<string> {
  const bootstrapData = await fetchBootstrapData();
  const places = bootstrapData.places || [];

  const searchTerm = input.place.toLowerCase();
  const matchedPlace = places.find(
    (entry) =>
      entry.place.slug.toLowerCase() === searchTerm ||
      entry.place.name.toLowerCase() === searchTerm ||
      entry.place.slug.toLowerCase().includes(searchTerm) ||
      entry.place.name.toLowerCase().includes(searchTerm),
  );

  if (!matchedPlace) {
    const availablePlaces = places.map((entry) => entry.place.name).join(", ");
    return `No place found matching "${input.place}". Available places: ${availablePlaces}`;
  }

  const eventsData = await fetchPlaceEvents(matchedPlace.place.slug);
  const events = eventsData.data?.events || [];

  if (events.length === 0) {
    return `No upcoming events found in ${matchedPlace.place.name}.`;
  }

  return JSON.stringify(
    {
      place: matchedPlace.place.name,
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
