import { SalesforceRecord } from "./types";

export function parseJsonFromOutput<T>(output: string): T {
  const first = output.indexOf("{");
  const last = output.lastIndexOf("}");
  if (first < 0 || last < first) throw new Error("Salesforce CLI returned no JSON output.");
  try {
    return JSON.parse(output.slice(first, last + 1)) as T;
  } catch (error) {
    throw new Error(`Unable to parse Salesforce CLI JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function flattenRecord(record: SalesforceRecord): Record<string, string> {
  const output: Record<string, string> = {};
  const visit = (value: unknown, path: string) => {
    if (path === "attributes") return;
    if (value === null || value === undefined) {
      output[path] = "";
    } else if (Array.isArray(value)) {
      output[path] = JSON.stringify(value);
    } else if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([key, child]) =>
        visit(child, path ? `${path}.${key}` : key),
      );
    } else {
      output[path] = String(value);
    }
  };
  Object.entries(record).forEach(([key, value]) => visit(value, key));
  return output;
}

export function getFieldValue(record: SalesforceRecord, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, record);
}

export function recordTitle(record: SalesforceRecord): string {
  const preferred = ["Name", "Subject", "CaseNumber", "Title", "DeveloperName"];
  for (const field of preferred) {
    const value = record[field];
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return record.Id ?? record.attributes?.type ?? "Salesforce Record";
}

export function recordSubtitle(record: SalesforceRecord): string {
  const type = record.attributes?.type;
  return [type, record.Id].filter(Boolean).join(" · ");
}

export function recordMarkdown(record: SalesforceRecord): string {
  const flat = flattenRecord(record);
  const rows = Object.entries(flat)
    .filter(([key]) => key !== "attributes")
    .map(([key, value]) => `| ${escapeMarkdown(key)} | ${escapeMarkdown(value || "—")} |`)
    .join("\n");
  return `# ${escapeMarkdown(recordTitle(record))}\n\n| Field | Value |\n| --- | --- |\n${rows}`;
}

export function escapeMarkdown(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

export function csvEscape(value: unknown): string {
  const text =
    value === null || value === undefined ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function recordsToCsv(records: SalesforceRecord[]): string {
  const flattened = records.map(flattenRecord);
  const headers = Array.from(new Set(flattened.flatMap((record) => Object.keys(record)))).filter(
    (header) => header !== "attributes",
  );
  return [
    headers.map(csvEscape).join(","),
    ...flattened.map((record) => headers.map((h) => csvEscape(record[h])).join(",")),
  ].join("\n");
}

export function escapeSoslTerm(term: string): string {
  return term.replace(/([?&|!{}[\]()^~*:\\"'+-])/g, "\\$1");
}

export function sanitizeFileName(value: string): string {
  return (
    value
      .replace(/[^A-Za-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "salesforce"
  );
}
