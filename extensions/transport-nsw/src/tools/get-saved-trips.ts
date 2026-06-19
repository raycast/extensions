import { LocalStorage } from "@raycast/api";
import { SavedTrip } from "../types";

const SAVED_TRIPS_KEY = "savedTrips";

/**
 * Get all saved/favorite trips.
 * Returns a list of trips the user has saved for quick access.
 */
export default async function tool() {
  const stored = await LocalStorage.getItem<string>(SAVED_TRIPS_KEY);
  const savedTrips: SavedTrip[] = stored ? JSON.parse(stored) : [];

  if (savedTrips.length === 0) {
    return {
      message: "No saved trips yet",
      trips: [],
    };
  }

  return {
    message: `You have ${savedTrips.length} saved trip${savedTrips.length === 1 ? "" : "s"}`,
    trips: savedTrips.map((trip) => ({
      id: trip.id,
      name: trip.name,
      origin: trip.origin,
      destination: trip.destination,
    })),
  };
}
