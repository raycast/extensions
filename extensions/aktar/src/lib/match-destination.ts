import type { Destination } from "../api/types";

/**
 * The destination with this ID, name, or bucket (case-insensitive), or the
 * default one when there's no query. Only an exact match counts, so an AI
 * tool can't land on a destination the user didn't mean; otherwise the error
 * lists the destinations to pick from.
 */
export function matchDestination(destinations: Destination[], query?: string): Destination {
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
    destinations.find((destination) => destination.bucket.toLowerCase() === needle);
  if (!match) {
    const names = destinations.map((destination) => `"${destination.name}" (bucket ${destination.bucket})`).join(", ");
    throw new Error(`No destination is named "${query}". Use one of these names exactly: ${names}.`);
  }
  return match;
}
