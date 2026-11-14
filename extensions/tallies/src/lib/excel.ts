import type { Entry } from "./types.ts";
import { timeInLabel, timeOutLabel } from "./markdown.ts";

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tsvCell(value: string): string {
  // Keep pasted values as text in spreadsheet apps instead of allowing a name
  // beginning with a formula character to execute as a formula.
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return /[\t\r\n"]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
}

/** Rich table for Excel; TSV fallback for applications that paste plain text. */
export function excelClipboard(entries: Entry[]): { html: string; text: string } {
  const rows = [
    ["Login", "Name", "Time in", "Time out"],
    ...entries.map((entry) => [entry.login, entry.name, timeInLabel(entry), timeOutLabel(entry)]),
  ];
  const htmlRows = rows.map((row, index) => {
    const tag = index === 0 ? "th" : "td";
    return `<tr>${row.map((value) => `<${tag} style="border:1px solid #b8b8b8;padding:4px 8px;mso-number-format:'\\@';white-space:pre-wrap">${escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>")}</${tag}>`).join("")}</tr>`;
  });
  return {
    html: `<html><head><meta charset="utf-8"></head><body><table style="border-collapse:collapse">${htmlRows.join("")}</table></body></html>`,
    text: rows.map((row) => row.map(tsvCell).join("\t")).join("\r\n"),
  };
}
