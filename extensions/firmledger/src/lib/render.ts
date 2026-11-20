import { Obj } from "./format";
import { BRAND, fmtDate, table } from "./theme";

export const humanize = (k: string) =>
  k
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\burl\b/gi, "URL")
    .replace(/^./, (c) => c.toUpperCase());

export const isScalar = (v: unknown) => v === null || v === undefined || typeof v !== "object";
const ISO = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}.*)?$/;
const isLong = (v: unknown) => typeof v === "string" && (v.length > 90 || v.includes("\n"));

/** One value, formatted for a table cell or metadata row. */
export function fmtValue(v: unknown, key = ""): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return /(^|_)(id|year|founded)$/i.test(key) ? String(v) : v.toLocaleString("en-GB");
  const s = String(v);
  if (ISO.test(s) || /(_at|_on|date)$/i.test(key)) return fmtDate(s) ?? s;
  return s;
}

/** Status words to brand colours (used for tags in lists and sidebars). */
export function statusColor(s?: string): string {
  const v = (s ?? "").toLowerCase();
  if (/(won|active|approved|verified|resolved|done|open|live|success|paid|read)/.test(v)) return BRAND.green;
  if (/(lost|closed|rejected|failed|revoked|suspended|removed|expired|error)/.test(v)) return BRAND.amber;
  if (/(new|pending|contacted|qualified|waiting|trial)/.test(v)) return BRAND.blue;
  return BRAND.navy;
}

const TITLE_FIRST = ["name", "title", "subject", "label", "slug", "id"];

/** Rows of scalar entries from an object, longest-text values excluded. */
export function scalarRows(o: Obj, skip: string[] = []): [string, string][] {
  return Object.entries(o)
    .filter(([k, v]) => !skip.includes(k) && isScalar(v) && v !== null && v !== undefined && v !== "" && !isLong(v))
    .map(([k, v]) => [humanize(k), fmtValue(v, k)] as [string, string]);
}

/** Long text fields (descriptions, messages) as readable paragraphs. */
export function paragraphs(o: Obj, skip: string[] = []): string {
  return Object.entries(o)
    .filter(([k, v]) => !skip.includes(k) && isLong(v))
    .map(([k, v]) => `### ${humanize(k)}\n\n${String(v).trim()}`)
    .join("\n\n");
}

function columnsOf(rows: Obj[]): string[] {
  const seen = new Map<string, number>();
  rows.forEach((r) => Object.entries(r).forEach(([k, v]) => isScalar(v) && !isLong(v) && seen.set(k, (seen.get(k) ?? 0) + 1)));
  const keys = [...seen.keys()];
  keys.sort((a, b) => {
    const ia = TITLE_FIRST.indexOf(a);
    const ib = TITLE_FIRST.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || (seen.get(b) ?? 0) - (seen.get(a) ?? 0);
  });
  return keys.slice(0, 6);
}

/**
 * Structured markdown for any JSON payload: scalar fields as an aligned Field/Value table,
 * nested objects as titled sections, arrays of objects as tables, long text as paragraphs.
 */
export function structured(v: unknown, level = 2, skip: string[] = []): string {
  if (v === null || v === undefined) return "No data.";
  if (typeof v !== "object") return String(v);
  const h = "#".repeat(Math.min(level, 4));
  if (Array.isArray(v)) {
    if (!v.length) return "None.";
    if (v.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      const rows = v as Obj[];
      const cols = columnsOf(rows);
      if (cols.length)
        return table(
          cols.map(humanize),
          rows.map((r) => cols.map((c) => fmtValue(r[c], c))),
        );
    }
    return v.map((x) => `- ${isScalar(x) ? fmtValue(x) : "`" + JSON.stringify(x) + "`"}`).join("\n");
  }
  const o = v as Obj;
  const parts: string[] = [];
  const rows = scalarRows(o, skip);
  if (rows.length) parts.push(table(["Field", "Value"], rows));
  const text = paragraphs(o, skip);
  if (text) parts.push(text);
  for (const [k, x] of Object.entries(o)) {
    if (skip.includes(k) || isScalar(x)) continue;
    if (Array.isArray(x) && !x.length) continue;
    parts.push(`${h} ${humanize(k)}\n\n${structured(x, level + 1)}`);
  }
  return parts.join("\n\n") || "No data.";
}
