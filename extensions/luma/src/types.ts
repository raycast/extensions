// Place types
export interface Coordinate {
  longitude: number;
  latitude: number;
}

export interface Place {
  api_id: string;
  coordinate: Coordinate;
  description: string;
  event_count: number;
  featured_event_api_ids: string[];
  geo_continent: string;
  hero_image_desktop_url: string;
  hero_image_mobile_url: string;
  hero_image_square_url: string;
  icon_url: string;
  is_launched: boolean;
  name: string;
  publication_name: string;
  slug: string;
  social_image_url: string;
  timezone: string;
  tint_color: string;
}

export interface PlaceEntry {
  place: Place;
  num_events: number;
  event_count: number;
  is_subscriber: boolean;
  distance_km: number;
}

export interface BootstrapResponse {
  places: PlaceEntry[];
}

// Event types
export interface GeoAddressInfo {
  mode?: string;
  city?: string;
  city_state?: string;
  region?: string;
  address?: string;
  country?: string;
  full_address?: string;
  short_address?: string;
  sublocality?: string | null;
}

export interface Event {
  api_id: string;
  calendar_api_id: string;
  cover_url: string;
  end_at: string;
  event_type: string;
  hide_rsvp: boolean;
  location_type: string;
  name: string;
  one_to_one: boolean;
  recurrence_id: string | null;
  show_guest_list: boolean;
  start_at: string;
  timezone: string;
  url: string;
  user_api_id: string;
  visibility: string;
  geo_address_info?: GeoAddressInfo;
  geo_address_visibility?: string;
  coordinate?: Coordinate;
  waitlist_enabled: boolean;
  waitlist_status: string;
}

export interface Calendar {
  api_id: string;
  name: string;
  avatar_url: string;
  description_short?: string;
  slug?: string;
  tint_color?: string;
  website?: string;
}

export interface Host {
  api_id: string;
  name: string;
  avatar_url: string;
  bio_short?: string;
  website?: string;
  twitter_handle?: string;
  instagram_handle?: string;
  linkedin_handle?: string;
}

export interface TicketInfo {
  price: number | null;
  is_free: boolean;
  max_price: number | null;
  is_sold_out: boolean;
  spots_remaining: number | null;
  is_near_capacity: boolean;
  require_approval: boolean;
}

export interface EventEntry {
  api_id: string;
  event: Event;
  calendar: Calendar;
  hosts: Host[];
  guest_count: number;
  ticket_count: number;
  ticket_info: TicketInfo;
  start_at: string;
  featured_guests: Host[];
}

export interface PlaceEventsResponse {
  kind: string;
  data: PlaceEventsData;
}

export interface PlaceEventsData {
  place: PlaceEntry;
  events: EventEntry[];
}

export const CONTINENT_NAMES: Record<string, string> = {
  apac: "Asia & Pacific",
  europe: "Europe",
  africa: "Africa",
  na: "North America",
  sa: "South America",
};

export const CONTINENT_ORDER = ["apac", "europe", "africa", "na", "sa"];
