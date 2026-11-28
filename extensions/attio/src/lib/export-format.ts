/**
 * Pure serializers for ExportActions (spec round-4c §4) — no @raycast/api
 * imports, so these run under plain vitest.
 */

function escapeCsvField(field: string): string {
  if (/[",\n]/.test(field)) return `"${field.replace(/"/g, '""')}"`;
  return field;
}

export function toCsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows].map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

function escapeMarkdownCell(cell: string): string {
  return cell.replace(/\|/g, "\\|");
}

export function toMarkdownTable(columns: string[], rows: string[][]): string {
  const header = `| ${columns.map(escapeMarkdownCell).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map(escapeMarkdownCell).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

export function toTsv(columns: string[], rows: string[][]): string {
  return [columns, ...rows].map((row) => row.join("\t")).join("\n");
}
