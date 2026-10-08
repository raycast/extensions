import { LocalStorage, Cache } from "@raycast/api";
import { SavedTrip } from "../types";

const SAVED_TRIPS_KEY = "savedTrips";
const cache = new Cache();

type Input = {
  /**
   * The stop ID for the origin station
   */
  originId: string;

  /**
   * The name of the origin station
   */
  originName: string;

  /**
   * The stop ID for the destination station
   */
  destinationId: string;

  /**
   * The name of the destination station
   */
  destinationName: string;
};

/**
 * Save a trip to favorites for quick access later.
 * The user can then quickly look up this trip without searching again.
 */
export default async function tool(input: Input) {
  const stored = await LocalStorage.getItem<string>(SAVED_TRIPS_KEY);
  const savedTrips: SavedTrip[] = stored ? JSON.parse(stored) : [];

  // Check if already saved
  const exists = savedTrips.some((t) => t.origin.id === input.originId && t.destination.id === input.destinationId);

  if (exists) {
    return {
      success: false,
      message: `Trip from ${input.originName} to ${input.destinationName} is already saved`,
    };
  }

  const newTrip: SavedTrip = {
    id: `${input.originId}-${input.destinationId}-${Date.now()}`,
    name: `${input.originName} → ${input.destinationName}`,
    origin: { id: input.originId, name: input.originName },
    destination: { id: input.destinationId, name: input.destinationName },
    createdAt: new Date().toISOString(),
  };

  savedTrips.push(newTrip);
  const json = JSON.stringify(savedTrips);
  await LocalStorage.setItem(SAVED_TRIPS_KEY, json);
  cache.set(SAVED_TRIPS_KEY, json);

  return {
    success: true,
    message: `Saved trip: ${input.originName} → ${input.destinationName}`,
    trip: newTrip,
  };
}

export function confirmation(input: Input) {
  return {
    info: [
      { name: "Origin", value: input.originName },
      { name: "Destination", value: input.destinationName },
    ],
  };
}
