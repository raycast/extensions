import { listDestinations } from "../api/client";
import type { Destination } from "../api/types";
import { matchDestination } from "./match-destination";

/** Finds a destination by its exact ID, name, or bucket, falling back to the default one; see `matchDestination`. */
export async function findDestination(query?: string): Promise<Destination> {
  return matchDestination(await listDestinations(), query);
}
