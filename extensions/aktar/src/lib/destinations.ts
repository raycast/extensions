import { listDestinations } from "../api/client";
import type { Destination } from "../api/types";

/** Finds a destination by ID, name, or bucket (case-insensitive), falling back to the default one. */
export async function findDestination(query?: string): Promise<Destination> {
  const destinations = await listDestinations();
  if (destinations.length === 0) {
    throw new Error("Aktar has no destinations yet. Add one in Aktar's Settings.");
  }
  const needle = query?.trim().toLowerCase();
  if (!needle) {
    return destinations.find((destination) => destination.isDefault) ?? destinations[0];
  }
  const match =
    destinations.find((destination) => destination.id.toLowerCase() === needle) ??
    destinations.find((destination) => destination.name.toLowerCase() === needle) ??
    destinations.find((destination) => destination.bucket.toLowerCase() === needle) ??
    destinations.find(
      (destination) =>
        destination.name.toLowerCase().includes(needle) || destination.bucket.toLowerCase().includes(needle),
    );
  if (!match) {
    const names = destinations.map((destination) => destination.name).join(", ");
    throw new Error(`No destination matches "${query}". Available destinations: ${names}.`);
  }
  return match;
}
