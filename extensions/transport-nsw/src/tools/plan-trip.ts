import { planTrip } from "../api";

type Input = {
  /**
   * The stop ID for the origin/departure station.
   * Get this from the search-stops tool.
   */
  originId: string;

  /**
   * The name of the origin station (for display purposes)
   */
  originName: string;

  /**
   * The stop ID for the destination/arrival station.
   * Get this from the search-stops tool.
   */
  destinationId: string;

  /**
   * The name of the destination station (for display purposes)
   */
  destinationName: string;

  /**
   * Optional departure time in HH:MM format (24-hour).
   * If not provided, uses current time.
   */
  departureTime?: string;
};

function formatTime(isoString?: string): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes}${ampm}`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}h` : `${hours}h ${mins}m`;
}

/**
 * Plan a trip between two stations in NSW.
 * Returns upcoming journey options with times, duration, and changes.
 */
export default async function tool(input: Input) {
  let dateTime: Date | undefined;

  if (input.departureTime) {
    const [hours, minutes] = input.departureTime.split(":").map(Number);
    dateTime = new Date();
    dateTime.setHours(hours, minutes, 0, 0);
  }

  const response = await planTrip(input.originId, input.destinationId, { dateTime });

  if (!response.journeys || response.journeys.length === 0) {
    return {
      message: `No trips found from ${input.originName} to ${input.destinationName}`,
      journeys: [],
    };
  }

  const journeys = response.journeys.slice(0, 5).map((journey) => {
    const firstLeg = journey.legs[0];
    const lastLeg = journey.legs[journey.legs.length - 1];
    const totalDuration = journey.legs.reduce((sum, leg) => sum + (leg.duration || 0), 0);

    const transportLegs = journey.legs
      .filter((leg) => leg.transportation)
      .map((leg) => ({
        line: leg.transportation?.number || leg.transportation?.name || "Unknown",
        from: leg.origin.disassembledName || leg.origin.name,
        to: leg.destination.disassembledName || leg.destination.name,
        departure: formatTime(leg.origin.departureTimePlanned),
        arrival: formatTime(leg.destination.arrivalTimePlanned),
        platform: leg.origin.properties?.platformName,
      }));

    return {
      departure: formatTime(firstLeg?.origin.departureTimePlanned),
      arrival: formatTime(lastLeg?.destination.arrivalTimePlanned),
      duration: formatDuration(totalDuration),
      changes: journey.interchanges || 0,
      legs: transportLegs,
    };
  });

  return {
    message: `Found ${journeys.length} trips from ${input.originName} to ${input.destinationName}`,
    journeys,
  };
}
