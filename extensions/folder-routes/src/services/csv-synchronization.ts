import { readFile, stat } from "node:fs/promises";

import { formatCsvSynchronizationErrors, validateCsvSynchronization } from "../domain/csv-synchronization";
import { saveDestinations } from "./destination-repository";
import { isDirectory } from "./filesystem";

const MAX_CSV_BYTES = 5 * 1024 * 1024;

export class CsvSynchronizationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join("\n"));
    this.name = "CsvSynchronizationError";
  }
}

export async function synchronizeDestinationsFromCsv(csvFile: string): Promise<number> {
  const metadata = await stat(csvFile);
  if (!metadata.isFile()) {
    throw new CsvSynchronizationError(["The selected CSV path is not a file."]);
  }
  if (metadata.size > MAX_CSV_BYTES) {
    throw new CsvSynchronizationError(["The synchronization CSV must be 5 MB or smaller."]);
  }

  const content = await readFile(csvFile, "utf8");
  const validation = await validateCsvSynchronization(content, isDirectory);
  const errors = formatCsvSynchronizationErrors(validation);
  if (errors.length > 0) {
    throw new CsvSynchronizationError(errors);
  }

  await saveDestinations(validation.destinations);
  return validation.destinations.length;
}
