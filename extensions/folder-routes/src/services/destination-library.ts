import type { Destination } from "../domain/destination";
import { type DestinationLibraryDependencies, persistDestinationLibrary } from "../domain/destination-persistence";
import { getDestinations, saveDestinations } from "./destination-repository";
import { writeDestinationsToCsv } from "./destination-csv";

const defaultDependencies: DestinationLibraryDependencies = {
  getDestinations,
  saveDestinations,
  writeDestinationsToCsv,
};

export async function saveDestinationLibrary(
  destinations: readonly Destination[],
  configuredCsvFile?: string,
  dependencies: DestinationLibraryDependencies = defaultDependencies,
): Promise<string> {
  return persistDestinationLibrary(destinations, configuredCsvFile, dependencies);
}
