import type { Destination } from "./destination";

export interface DestinationLibraryDependencies {
  getDestinations: () => Promise<Destination[]>;
  saveDestinations: (destinations: readonly Destination[]) => Promise<void>;
  writeDestinationsToCsv: (
    configuredCsvFile: string | undefined,
    destinations: readonly Destination[],
  ) => Promise<string>;
}

export async function persistDestinationLibrary(
  destinations: readonly Destination[],
  configuredCsvFile: string | undefined,
  dependencies: DestinationLibraryDependencies,
): Promise<string> {
  const previousDestinations = await dependencies.getDestinations();
  await dependencies.saveDestinations(destinations);

  try {
    return await dependencies.writeDestinationsToCsv(configuredCsvFile, destinations);
  } catch (csvError) {
    try {
      await dependencies.saveDestinations(previousDestinations);
    } catch (rollbackError) {
      throw new AggregateError(
        [csvError, rollbackError],
        "The destinations CSV could not be saved and Raycast's previous destination library could not be restored.",
      );
    }
    throw csvError;
  }
}
