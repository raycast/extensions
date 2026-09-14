import type { Row } from "./client";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnsOf(rows: Row[]): string[] {
  // Later rows can carry keys the first one lacks (json-shaped results), so union them.
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) if (!columns.includes(key)) columns.push(key);
  }
  return columns;
}

/** Renders rows as a GitHub-flavored Markdown table, capped at `maxRows`. */
export function toMarkdownTable(rows: Row[], maxRows = 100): { markdown: string; truncated: boolean } {
  if (rows.length === 0) return { markdown: "_No rows._", truncated: false };
  const columns = columnsOf(rows);
  const escape = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const header = `| ${columns.join(" | ")} |`;
  const divider = `| ${columns.map(() => "---").join(" | ")} |`;
  const shown = rows.slice(0, maxRows);
  const body = shown.map((row) => `| ${columns.map((c) => escape(cell(row[c]))).join(" | ")} |`).join("\n");
  return { markdown: [header, divider, body].join("\n"), truncated: rows.length > maxRows };
}

export function toJson(rows: Row[]): string {
  return JSON.stringify(rows, null, 2);
}

export function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const columns = columnsOf(rows);
  const escape = (text: string) => (/[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const lines = [columns.map(escape).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escape(cell(row[c]))).join(","));
  return lines.join("\n");
}

/** Message for a statement that returns no rows (INSERT/UPDATE/DDL), e.g. "UPDATE 3". */
export function summarizeWrite(command: string, rowCount: number | null): string {
  if (!command) return "OK";
  return rowCount === null ? command : `${command} ${rowCount}`;
}

/** Collapses a statement to a single line for list titles and history entries. */
export function oneLine(sql: string, maxLength = 90): string {
  const flat = sql.replace(/\s+/g, " ").trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat;
}

/** Turns a driver error into something worth showing a user, keeping PostgreSQL's own hints. */
export function describeError(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const e = error as { message?: string; detail?: string; hint?: string; position?: string; code?: string };
  const parts = [e.message ?? "Query failed"];
  if (e.detail) parts.push(e.detail);
  if (e.hint) parts.push(`Hint: ${e.hint}`);
  if (e.code === "25006") parts.push("This statement was run read-only, so the write was refused.");
  return parts.join(" · ");
}
