import type { Destination } from "../domain/destination";
import { saveDestinations } from "./destination-repository";
import { writeDestinationsToCsv } from "./destination-csv";

export async function saveDestinationLibrary(
  destinations: readonly Destination[],
  configuredCsvFile?: string,
): Promise<string> {
  const csvFile = await writeDestinationsToCsv(configuredCsvFile, destinations);
  await saveDestinations(destinations);
  return csvFile;
}
