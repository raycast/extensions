// P2-S4: Export utilities — convert data to JSON and CSV formats

/**
 * Convert records to JSON string
 */
export function toJson(records: unknown[]): string {
  return JSON.stringify(records, null, 2);
}

/**
 * Convert records to CSV string
 * First record's keys are used as headers
 * Values are escaped: quotes replaced with double quotes, wrapped if contains comma or quote
 */
export function toCsv(records: Record<string, unknown>[]): string {
  if (records.length === 0) {
    return "";
  }

  // Get headers from first record
  const headers = Object.keys(records[0]);

  // Helper to escape CSV field value
  const escapeCsvField = (value: unknown): string => {
    const str = String(value ?? "");
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build header row
  const headerRow = headers.map(escapeCsvField).join(",");

  // Build data rows
  const dataRows = records.map((record) => headers.map((header) => escapeCsvField(record[header])).join(","));

  // Combine all rows
  return [headerRow, ...dataRows].join("\n");
}

/**
 * Format timestamp as a human-readable filename suffix
 */
export function getExportTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
}

/**
 * Generate filename for export
 */
export function getExportFilename(basename: string, format: "json" | "csv"): string {
  const timestamp = getExportTimestamp();
  return `${basename}-${timestamp}.${format}`;
}
