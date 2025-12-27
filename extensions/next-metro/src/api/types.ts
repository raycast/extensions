// PRIM API Response Types for Next Departures
// Based on Navitia SIRI-Lite format used by Île-de-France Mobilités

export interface PRIMDeparturesResponse {
  disruptions: Disruption[];
  notes: Note[];
  departures: Departure[];
  context: Context;
  links: Link[];
}

export interface Departure {
  display_informations: DisplayInformations;
  stop_point: StopPoint;
  route: Route;
  stop_date_time: StopDateTime;
  links: Link[];
}

export interface DisplayInformations {
  direction: string;
  code: string;
  network: string;
  links: Link[];
  color: string;
  name: string;
  physical_mode: string;
  headsign: string;
  label: string;
  equipments: string[];
  text_color: string;
  commercial_mode: string;
  description: string;
}

export interface StopPoint {
  id: string;
  name: string;
  label: string;
  coord: Coord;
  links: Link[];
  equipments: string[];
}

export interface Coord {
  lat: string;
  lon: string;
}

export interface Route {
  id: string;
  name: string;
  direction: Direction;
  direction_type: string;
  links: Link[];
}

export interface Direction {
  id: string;
  name: string;
  quality: number;
  stop_area: StopArea;
  embedded_type: string;
}

export interface StopArea {
  id: string;
  name: string;
  label: string;
  coord: Coord;
  timezone: string;
  codes: Code[];
  links: Link[];
}

export interface Code {
  type: string;
  value: string;
}

export interface StopDateTime {
  arrival_date_time: string;
  departure_date_time: string;
  base_arrival_date_time: string;
  base_departure_date_time: string;
  data_freshness: "realtime" | "base_schedule";
  links: Link[];
}

export interface Disruption {
  id: string;
  disruption_id: string;
  impact_id: string;
  status: string;
  severity: Severity;
  messages: Message[];
  application_periods: ApplicationPeriod[];
  cause: string;
  category: string;
}

export interface Severity {
  name: string;
  priority: number;
  color: string;
  effect: string;
}

export interface Message {
  text: string;
  channel: Channel;
}

export interface Channel {
  id: string;
  name: string;
  content_type: string;
}

export interface ApplicationPeriod {
  begin: string;
  end: string;
}

export interface Note {
  id: string;
  value: string;
}

export interface Context {
  timezone: string;
  current_datetime: string;
}

export interface Link {
  href?: string;
  type: string;
  rel?: string;
  id?: string;
  templated?: boolean;
  internal?: boolean;
}

// Menu bar display mode options
export type MenuBarDisplayMode = "leave" | "metro" | "countdown";

// Preferences types
export interface Preferences {
  apiKey: string;
  menuBarDisplayMode?: MenuBarDisplayMode;
}

// Saved stop configuration (stored in LocalStorage)
export interface StopConfig {
  lineId: string;
  lineName: string;
  lineCode: string;
  lineColor: string;
  stopId: string;
  stopName: string;
  favoriteDirections?: string[]; // Optional: user's preferred directions (can select multiple for branching lines)
  walkingTimeMinutes?: number; // Optional: time in minutes to walk to the stop
}

// Lines API Response
export interface PRIMLinesResponse {
  lines: Line[];
  pagination: Pagination;
  links: Link[];
}

export interface Line {
  id: string;
  name: string;
  code: string;
  color: string;
  text_color: string;
  opening_time: string;
  closing_time: string;
  routes: Route[];
  physical_modes: PhysicalMode[];
  commercial_mode: CommercialMode;
  network: Network;
  links: Link[];
}

export interface PhysicalMode {
  id: string;
  name: string;
}

export interface CommercialMode {
  id: string;
  name: string;
}

export interface Network {
  id: string;
  name: string;
  links: Link[];
}

export interface Pagination {
  total_result: number;
  start_page: number;
  items_per_page: number;
  items_on_page: number;
}

// Stop Areas for Line API Response
export interface PRIMStopAreasResponse {
  stop_areas: StopAreaFull[];
  pagination: Pagination;
  links: Link[];
}

export interface StopAreaFull {
  id: string;
  name: string;
  label: string;
  coord: Coord;
  timezone: string;
  codes: Code[];
  links: Link[];
  administrative_regions?: AdministrativeRegion[];
}

export interface AdministrativeRegion {
  id: string;
  name: string;
  label: string;
  level: number;
  zip_code: string;
  coord: Coord;
}

// Parsed departure for display
export interface ParsedDeparture {
  id: string;
  lineName: string;
  lineCode: string;
  lineColor: string;
  textColor: string;
  direction: string;
  departureTime: Date;
  minutesUntil: number;
  isRealTime: boolean;
  network: string;
  physicalMode: string;
}
