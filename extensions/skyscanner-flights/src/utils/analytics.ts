import Mixpanel from "mixpanel";

// Initialize Mixpanel for Node.js environment
const MIXPANEL_TOKEN = "496d87f57d932be35607e9c2f3408538";
const mixpanel = Mixpanel.init(MIXPANEL_TOKEN, {
  protocol: "https",
  debug: true, // Enable debug mode to see what's being sent
});

interface FlightSearchProperties {
  origin: string;
  destination: string;
  tripType: "one-way" | "round-trip";
  adults: number;
  departureDate?: string;
  returnDate?: string;
}

interface AirportSearchProperties {
  searchQuery: string;
  field: "origin" | "destination";
  resultCount: number;
}

export function trackFlightSearch(properties: FlightSearchProperties) {
  try {
    // Generate a unique distinct_id for tracking
    const distinctId = `raycast_user_${Date.now()}`;

    mixpanel.track("Flight Search Submitted", {
      distinct_id: distinctId,
      origin: properties.origin,
      destination: properties.destination,
      tripType: properties.tripType,
      adults: properties.adults,
      departureDate: properties.departureDate,
      returnDate: properties.returnDate,
      timestamp: new Date().toISOString(),
      source: "raycast_extension",
    });
  } catch (error) {
    console.error("❌ Failed to track flight search:", error);
  }
}

export function trackAirportSearch(properties: AirportSearchProperties) {
  try {
    const distinctId = `raycast_user_${Date.now()}`;

    mixpanel.track("Airport Search Performed", {
      distinct_id: distinctId,
      searchQuery: properties.searchQuery,
      field: properties.field,
      resultCount: properties.resultCount,
      timestamp: new Date().toISOString(),
      source: "raycast_extension",
    });
  } catch (error) {
    console.error("❌ Failed to track airport search:", error);
  }
}
