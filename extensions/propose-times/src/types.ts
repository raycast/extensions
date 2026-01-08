// Shared types for calendar providers

export type ProviderType = "savvycal" | "calcom";

export interface TimeSlot {
  start_at: string;
  end_at: string;
}

export interface LinkInfo {
  id: string;
  slug: string;
  durations: number[];
  defaultDuration: number;
}

export interface FetchSlotsResult {
  slots: TimeSlot[];
  linkInfo: LinkInfo;
}

export interface ProviderConfig {
  // SavvyCal
  savvycalToken?: string;
  savvycalLink?: string;
  savvycalUsername?: string;
  // Cal.com
  calcomUsername?: string;
  calcomEventSlug?: string;
}

export interface CalendarProvider {
  name: string;
  fetchSlots(
    config: ProviderConfig,
    startDate: Date,
    endDate: Date,
  ): Promise<FetchSlotsResult>;
  generateBookingUrl(
    config: ProviderConfig,
    linkInfo: LinkInfo,
    slot: TimeSlot,
    timezone: string,
    bookerUrl: string | undefined,
    duration: number,
    alternativeSlots?: TimeSlot[],
  ): string;
  getFallbackUrl(config: ProviderConfig): string;
}
