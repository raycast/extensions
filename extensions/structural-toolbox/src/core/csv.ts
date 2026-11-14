import { RecordRow } from "./types";
/** RFC4180 parser; quoted commas, escaped quotes and multiline fields are supported. */
export function parseCSV(text: string): RecordRow[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (!quoted && cell.length) throw Error("Unexpected quote in CSV field");
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quoted CSV field");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift()!.map((h) => h.trim());
  if (new Set(headers).size !== headers.length) throw Error("Duplicate CSV header");
  if (!headers.includes("id")) throw Error("CSV requires an id column");
  const ids = new Set<string>();
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw Error(`CSV row ${i + 2}: expected ${headers.length} columns, got ${r.length}`);
    const o = Object.fromEntries(headers.map((h, j) => [h, r[j].trim()]));
    if (!o.id || ids.has(o.id.toLowerCase())) throw Error(`Missing or duplicate ID at CSV row ${i + 2}`);
    ids.add(o.id.toLowerCase());
    return o;
  });
}
export function writeCSV(rows: RecordRow[]): string {
  const headers = [...new Set(rows.flatMap(Object.keys))];
  const escape = (s: string) => (/[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  return (
    [headers, ...rows.map((r) => headers.map((h) => r[h] ?? ""))].map((r) => r.map(escape).join(",")).join("\n") + "\n"
  );
}
export function numberField(row: RecordRow, key: string): number | null {
  if (row[key] === undefined || row[key] === "") return null;
  const n = Number(row[key]);
  if (!Number.isFinite(n)) throw Error(`${row.id}: invalid ${key} (${row[key]})`);
  return n;
}
