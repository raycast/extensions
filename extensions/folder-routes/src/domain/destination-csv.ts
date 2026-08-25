import type { Destination } from "./destination";
import { parseCsv, protectSpreadsheetText } from "./csv";
import { parseCsvImport } from "./import";

export const DESTINATION_CSV_HEADERS = ["id", "name", "path", "keywords", "copy", "move", "pinned"] as const;

export interface DestinationCsvAppendPreparation {
  headers: string[];
  content: string;
}

export function prepareDestinationCsvAppend(content: string): DestinationCsvAppendPreparation {
  const parsed = parseCsvImport(content);
  if (parsed.fatalErrors.length > 0) {
    throw new Error(parsed.fatalErrors.join(" "));
  }

  const rows = parseCsv(content);
  const headers = rows[0]?.values.map((header) => header.trim().toLocaleLowerCase()) ?? [];
  const missingHeaders = DESTINATION_CSV_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`The destinations CSV must include: ${missingHeaders.join(", ")}.`);
  }

  return { headers, content };
}

export function serializeDestinationCsvRows(destinations: readonly Destination[], headers: readonly string[]): string {
  return destinations
    .map((destination) => headers.map((header) => csvValue(destinationValue(destination, header))).join(","))
    .join("\n");
}

function destinationValue(destination: Destination, header: string): string {
  switch (header) {
    case "id":
      return destination.id;
    case "name":
      return destination.name;
    case "path":
      return destination.path;
    case "keywords":
      return destination.keywords.join(";");
    case "copy":
      return String(destination.copy);
    case "move":
      return String(destination.move);
    case "pinned":
      return String(destination.pinned);
    default:
      throw new Error(`Unsupported destinations CSV header: ${header}.`);
  }
}

function csvValue(value: string): string {
  const protectedValue = protectSpreadsheetText(value);
  return /[",\r\n]/.test(protectedValue) ? `"${protectedValue.replaceAll('"', '""')}"` : protectedValue;
}
