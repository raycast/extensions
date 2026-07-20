import { searchStops } from "../api";

type Input = {
  /**
   * The search query to find stops/stations.
   * Can be a station name like "Central", "Bondi Junction", "Town Hall", etc.
   */
  query: string;
};

/**
 * Search for transport stops and stations in NSW.
 * Returns a list of matching stops with their IDs and transport modes.
 * Use this to find stop IDs needed for planning trips.
 */
export default async function tool(input: Input) {
  if (!input.query || input.query.length < 2) {
    return { error: "Query must be at least 2 characters" };
  }

  const response = await searchStops(input.query);
  const stops = (response.locations || [])
    .filter((loc) => loc.type === "stop")
    .slice(0, 10)
    .map((stop) => ({
      id: stop.id,
      name: stop.disassembledName || stop.name,
      location: stop.parent?.name,
      modes: stop.modes,
    }));

  return { stops };
}
