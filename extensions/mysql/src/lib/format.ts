export type Row = Record<string, unknown>;

export function isRows(value: unknown): value is Row[] {
  return Array.isArray(value);
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function columnsOf(rows: Row[]): string[] {
  return rows.length > 0 ? Object.keys(rows[0]) : [];
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

/** Message for a non-SELECT result header (INSERT/UPDATE/DDL). */
export function summarizeWrite(header: unknown): string {
  const h = header as { affectedRows?: number; insertId?: number; info?: string } | null;
  const parts: string[] = [];
  if (h?.affectedRows !== undefined) parts.push(`${h.affectedRows} row(s) affected`);
  if (h?.insertId) parts.push(`insertId: ${h.insertId}`);
  if (h?.info) parts.push(h.info);
  return parts.join(" · ") || "OK";
}
