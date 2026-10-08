// --- Types for data received FROM the API Wrapper ---
export interface Station {
  id: string; // Corresponds to stop_id
  name: string;
  latitude?: number; // Optional, as provided by wrapper
  longitude?: number; // Optional, as provided by wrapper
  system?: FilterableSystem; // System identifier (e.g., "LIRR", "SUBWAY", "MNR")
  lines?: string[]; // Array of route short names
  borough?: string; // Borough station is located in
  accessibilityStatus: string; // Accessibility status of the station
  accessibilityNotes?: string; // Accessibility notes for the station
}

export type FilterableSystem = "LIRR" | "SUBWAY" | "MNR"; // Systems that can be filtered
export type Direction = string;

export interface Departure {
  tripId?: string;
  routeId?: string;
  routeShortName?: string; // e.g., "L", "4", ""
  routeLongName?: string; // e.g., "14 St-Canarsie", "Ronkonkoma Branch"
  peakStatus?: string; // e.g., "Peak", "Off Peak", ""
  routeColor?: string; // HEX color without preceeding #
  destination: string;
  direction: Direction | null;
  departureTime: string | null;
  delayMinutes: number | null;
  track?: string;
  status: string; // e.g., "On Time", "Delayed 5 min", "Due", "Scheduled"
  destinationBorough: string | null;
  system: FilterableSystem;
}

export interface ServiceAlert {
  id: string; // Unique ID for the alert entity
  title: string;
  description: string;
  affectedLines: string[]; // Array of route short names
  affectedStations: string[]; // Array of station names
  affectedLinesLabels: string[]; // Array of route labels
  affectedStationsLabels: string[]; // Array of station labels
  // IMPORTANT: These will be received as STRINGS from JSON, need conversion to Date objects after fetch
  startDate?: string | null;
  endDate?: string | null;
  url?: string;
}

// --- Utility Type for processing Departures/Alerts after fetching ---
// We define this separately to represent the data AFTER converting date strings
export interface ProcessedDeparture extends Omit<Departure, "departureTime"> {
  departureTime: Date | null; // Now a Date object
  routeColor?: string; // HEX color without preceeding #
  routeTextColor?: string; // HEX color without preceeding #
  systemRouteId: string; // Combination of system and routeId
  delayMinutes: number | null;
}

export interface ProcessedServiceAlert extends Omit<ServiceAlert, "startDate" | "endDate"> {
  startDate?: Date | null; // Now a Date object
  endDate?: Date | null; // Now a Date object
  affectedLines: string[]; // Array of route short names
  affectedStations: string[]; // Array of station names
}

export interface AlertsResponse {
  alerts: ProcessedServiceAlert[];
}

export interface StationListItemProps {
  station: Station;
  isFavorite: boolean;
  addFavorite: (id: string) => void;
  removeFavorite: (id: string) => void;
}

export interface ErrorResponse {
  error: {
    message: string;
    code?: number;
    details?: string;
  };
}
