import { format } from "date-fns";
import type {
  CalendarProvider,
  ProviderConfig,
  TimeSlot,
  LinkInfo,
  FetchSlotsResult,
} from "../types";

interface SchedulingLink {
  id: string;
  slug: string;
  name: string;
  durations?: number[];
  default_duration?: number;
}

interface SavvyCalLinksResponse {
  data?: SchedulingLink[];
  entries?: SchedulingLink[];
}

async function fetchLinkInfo(token: string, slug: string): Promise<LinkInfo> {
  const response = await fetch("https://api.savvycal.com/v1/links", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const responseText = await response.text();
  console.log("SavvyCal /v1/links response:", response.status);

  if (!response.ok) {
    throw new Error(`SavvyCal API error fetching links: ${response.status}`);
  }

  let data: SavvyCalLinksResponse;
  try {
    data = JSON.parse(responseText) as SavvyCalLinksResponse;
  } catch {
    throw new Error(`Invalid JSON from SavvyCal`);
  }

  const links =
    data.entries || data.data || (data as unknown as SchedulingLink[]);
  const link = Array.isArray(links) ? links.find((l) => l.slug === slug) : null;

  if (!link) {
    const availableSlugs = Array.isArray(links)
      ? links.map((l) => l.slug).join(", ")
      : "unknown structure";
    throw new Error(
      `No scheduling link found with slug "${slug}". Available: ${availableSlugs || "none"}`,
    );
  }

  return {
    id: link.id,
    slug: link.slug,
    durations: link.durations || [30],
    defaultDuration: link.default_duration || 30,
  };
}

export const savvycalProvider: CalendarProvider = {
  name: "SavvyCal",

  async fetchSlots(
    config: ProviderConfig,
    startDate: Date,
    endDate: Date,
  ): Promise<FetchSlotsResult> {
    const { savvycalToken, savvycalLink } = config;

    if (!savvycalToken || !savvycalLink) {
      throw new Error("SavvyCal token and link slug are required");
    }

    const linkInfo = await fetchLinkInfo(savvycalToken, savvycalLink);

    const fromDate = new Date(startDate);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(endDate);
    toDate.setHours(23, 59, 59, 999);

    const response = await fetch(
      `https://api.savvycal.com/v1/links/${linkInfo.id}/slots?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
      {
        headers: {
          Authorization: `Bearer ${savvycalToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const responseText = await response.text();
    console.log("SavvyCal slots response:", response.status);

    if (!response.ok) {
      throw new Error(`SavvyCal API error: ${response.status}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid JSON from SavvyCal slots`);
    }

    const rawSlots = Array.isArray(data)
      ? data
      : data.data || data.entries || [];

    // Normalize to our TimeSlot format, filtering out malformed slots
    const slots: TimeSlot[] = rawSlots
      .filter(
        (s: { start_at?: string; end_at?: string }) => s.start_at && s.end_at,
      )
      .map((s: { start_at: string; end_at: string }) => ({
        start_at: s.start_at,
        end_at: s.end_at,
      }));

    return { slots, linkInfo };
  },

  generateBookingUrl(
    config: ProviderConfig,
    linkInfo: LinkInfo,
    slot: TimeSlot,
    timezone: string,
    bookerUrl: string | undefined,
    duration: number,
  ): string {
    const { savvycalUsername, savvycalLink } = config;
    const slotDate = new Date(slot.start_at);

    // Use one-click booker if configured
    if (bookerUrl) {
      const params = new URLSearchParams({
        slot: slotDate.toISOString(),
        link_id: linkInfo.id,
        duration: duration.toString(),
        tz: timezone,
        provider: "savvycal",
      });
      return `${bookerUrl}/book?${params.toString()}`;
    }

    // Fallback: direct SavvyCal link
    const dateStr = format(slotDate, "yyyy-MM-dd");
    return `https://savvycal.com/${savvycalUsername}/${savvycalLink}?from=${dateStr}&time_zone=${encodeURIComponent(timezone)}`;
  },

  getFallbackUrl(config: ProviderConfig): string {
    return `https://savvycal.com/${config.savvycalUsername}/${config.savvycalLink}`;
  },
};
