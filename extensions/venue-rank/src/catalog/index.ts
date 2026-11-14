import snapshot from "./data/snapshot.json";
import { createCatalog } from "./engine";
import type { SearchOptions, VenueDataset } from "./types";

export * from "./engine";

export const bundledDataset: VenueDataset = snapshot as VenueDataset;
let defaultCatalog: ReturnType<typeof createCatalog> | undefined;
export function getDefaultCatalog(): ReturnType<typeof createCatalog> {
  return (defaultCatalog ??= createCatalog(bundledDataset));
}
export const searchVenues = (query: string, options?: SearchOptions) => getDefaultCatalog().search(query, options);
export const getVenue = (id: string) => getDefaultCatalog().getVenue(id);
export const getAssessments = (id: string) => getDefaultCatalog().getAssessments(id);
