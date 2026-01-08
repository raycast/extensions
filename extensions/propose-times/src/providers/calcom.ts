import { format } from "date-fns";
import type {
  CalendarProvider,
  ProviderConfig,
  TimeSlot,
  LinkInfo,
  FetchSlotsResult,
} from "../types";
import { encodeAlternativeSlots } from "../utils";

interface CalComSlot {
  start: string;
}

interface CalComSlotsResponse {
  status: string;
  data: Record<string, CalComSlot[]>;
}

interface CalComEventType {
  id: number;
  slug: string;
  title: string;
  lengthInMinutes: number;
  lengthInMinutesOptions?: number[];
}

interface CalComEventTypesResponse {
  status: string;
  data: CalComEventType[];
}

// Cal.com v2 slots API returns slots grouped by date
// Response: { status: "success", data: { "2024-01-15": [{ start: "2024-01-15T10:00:00Z" }] } }

export const calcomProvider: CalendarProvider = {
  name: "Cal.com",

  async fetchSlots(
    config: ProviderConfig,
    startDate: Date,
    endDate: Date,
  ): Promise<FetchSlotsResult> {
    const { calcomUsername, calcomEventSlug } = config;

    if (!calcomUsername || !calcomEventSlug) {
      throw new Error("Cal.com username and event slug are required");
    }

    // First, fetch event type info to get allowed durations
    const eventTypeUrl = `https://api.cal.com/v2/event-types?username=${encodeURIComponent(calcomUsername)}&eventSlug=${encodeURIComponent(calcomEventSlug)}`;
    console.log("Cal.com event type request:", eventTypeUrl);

    const eventTypeResponse = await fetch(eventTypeUrl, {
      headers: {
        "cal-api-version": "2024-06-14",
        "Content-Type": "application/json",
      },
    });

    let eventType: CalComEventType | null = null;
    if (eventTypeResponse.ok) {
      try {
        const eventTypeData =
          (await eventTypeResponse.json()) as CalComEventTypesResponse;
        if (eventTypeData.data && eventTypeData.data.length > 0) {
          eventType = eventTypeData.data[0];
          console.log(
            "Cal.com event type found:",
            eventType.title,
            "durations:",
            eventType.lengthInMinutesOptions,
          );
        }
      } catch (err) {
        console.log("Failed to parse event type response:", err);
      }
    } else {
      console.error("Failed to fetch event type:", eventTypeResponse.status);
      throw new Error(
        `Could not fetch Cal.com event type details (status: ${eventTypeResponse.status}). Please check your username and event slug.`,
      );
    }

    // Now fetch slots
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");

    const url = `https://api.cal.com/v2/slots?eventTypeSlug=${encodeURIComponent(calcomEventSlug)}&username=${encodeURIComponent(calcomUsername)}&start=${startStr}&end=${endStr}&timeZone=UTC`;

    console.log("Cal.com slots request:", url);

    const response = await fetch(url, {
      headers: {
        "cal-api-version": "2024-09-04",
        "Content-Type": "application/json",
      },
    });

    const responseText = await response.text();
    console.log("Cal.com slots response:", response.status);

    if (!response.ok) {
      throw new Error(
        `Cal.com API error: ${response.status} - ${responseText.slice(0, 200)}`,
      );
    }

    let data: CalComSlotsResponse;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Invalid JSON from Cal.com: ${responseText.slice(0, 200)}`,
      );
    }

    // Get default duration from event type or fallback
    const defaultDuration = eventType?.lengthInMinutes || 30;

    // Convert Cal.com's grouped format to our flat TimeSlot array
    // Response format: { data: { "2024-01-15": [{ start: "2024-01-15T10:00:00Z" }] }, status: "success" }
    const slots: TimeSlot[] = [];
    const slotsData = data.data || {};

    for (const dateKey of Object.keys(slotsData)) {
      const daySlots = slotsData[dateKey];
      for (const slot of daySlots) {
        // Cal.com returns { start: "2024-01-15T10:00:00Z" }
        const startTime = slot.start;
        // Calculate end time using actual default duration
        const endTime = new Date(
          new Date(startTime).getTime() + defaultDuration * 60 * 1000,
        ).toISOString();
        slots.push({
          start_at: startTime,
          end_at: endTime,
        });
      }
    }

    // Build LinkInfo from event type data
    const durations =
      eventType?.lengthInMinutesOptions &&
      eventType.lengthInMinutesOptions.length > 0
        ? eventType.lengthInMinutesOptions
        : [defaultDuration]; // If no options, just use the single default duration

    const linkInfo: LinkInfo = {
      id: eventType?.id?.toString() || `${calcomUsername}/${calcomEventSlug}`,
      slug: calcomEventSlug,
      durations,
      defaultDuration,
    };

    return { slots, linkInfo };
  },

  generateBookingUrl(
    config: ProviderConfig,
    _linkInfo: LinkInfo,
    slot: TimeSlot,
    timezone: string,
    bookerUrl: string | undefined,
    duration: number,
    alternativeSlots?: TimeSlot[],
  ): string {
    const { calcomUsername, calcomEventSlug } = config;
    if (!calcomUsername || !calcomEventSlug) {
      console.error(
        "Cal.com username or event slug is missing for generating booking URL.",
      );
      return "https://cal.com";
    }
    const slotDate = new Date(slot.start_at);

    // Use one-click booker if configured
    if (bookerUrl) {
      const params = new URLSearchParams({
        slot: slotDate.toISOString(),
        username: calcomUsername,
        event_slug: calcomEventSlug,
        duration: duration.toString(),
        tz: timezone,
        provider: "calcom",
      });

      // Encode alternative slots for the booking dropdown
      encodeAlternativeSlots(params, alternativeSlots);

      return `${bookerUrl}/book?${params.toString()}`;
    }

    // Fallback: direct Cal.com link with slot pre-selected
    // Cal.com URL format: cal.com/{username}/{event}?date=2024-01-15&slot=2024-01-15T10:00:00
    const dateStr = format(slotDate, "yyyy-MM-dd");
    const slotTimeParam = slotDate.toISOString();
    return `https://cal.com/${calcomUsername}/${calcomEventSlug}?date=${dateStr}&slot=${encodeURIComponent(slotTimeParam)}`;
  },

  getFallbackUrl(config: ProviderConfig): string {
    return config.calcomUsername && config.calcomEventSlug
      ? `https://cal.com/${config.calcomUsername}/${config.calcomEventSlug}`
      : "https://cal.com";
  },
};
