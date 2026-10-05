import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import type { Destination } from "../domain/destination";
import {
  DESTINATION_CSV_HEADERS,
  prepareDestinationCsvAppend,
  serializeDestinationCsvRows,
} from "../domain/destination-csv";

const MAX_CSV_BYTES = 5 * 1024 * 1024;
export const DEFAULT_DESTINATIONS_CSV_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Folder Routes",
  "destinations.csv",
);

export function resolveDestinationsCsvPath(configuredPath?: string): string {
  return configuredPath || DEFAULT_DESTINATIONS_CSV_PATH;
}

export async function writeDestinationsToCsv(
  configuredPath: string | undefined,
  destinations: readonly Destination[],
): Promise<string> {
  const csvFile = resolveDestinationsCsvPath(configuredPath);
  const headers = await getCsvHeaders(csvFile);
  const rows = serializeDestinationCsvRows(destinations, headers);
  const content = `${headers.join(",")}\n${rows}${rows ? "\n" : ""}`;
  const temporaryFile = join(dirname(csvFile), `.${randomUUID()}.folder-routes.tmp`);

  await mkdir(dirname(csvFile), { recursive: true });
  await writeFile(temporaryFile, content, "utf8");
  await rename(temporaryFile, csvFile);
  return csvFile;
}

async function getCsvHeaders(csvFile: string): Promise<string[]> {
  let content: string;
  try {
    const metadata = await stat(csvFile);
    if (!metadata.isFile()) {
      throw new Error("The configured Destinations CSV path is not a file.");
    }
    if (metadata.size > MAX_CSV_BYTES) {
      throw new Error("The Destinations CSV must be 5 MB or smaller.");
    }
    content = await readFile(csvFile, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return [...DESTINATION_CSV_HEADERS];
    }
    throw error;
  }

  return prepareDestinationCsvAppend(content).headers;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && (error as NodeJS.ErrnoException).code === "ENOENT";
}
