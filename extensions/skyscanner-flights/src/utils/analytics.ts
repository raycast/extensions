import Mixpanel from "mixpanel";

// Initialize Mixpanel for Node.js environment
const MIXPANEL_TOKEN = "496d87f57d932be35607e9c2f3408538";
const mixpanel = Mixpanel.init(MIXPANEL_TOKEN, {
  protocol: "https",
});

interface FlightSearchProperties {
  origin: string;
  destination: string;
  tripType: "one-way" | "round-trip";
  adults: number;
  departureDate?: string;
  returnDate?: string;
  originalQuery?: string;
  usedAIParsing?: boolean;
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
      originalQuery: properties.originalQuery,
      usedAIParsing: properties.usedAIParsing,
      timestamp: new Date().toISOString(),
      source: "raycast_extension",
    });
  } catch (error) {
    console.error("❌ Failed to track flight search:", error);
  }
}
