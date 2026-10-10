import { environment } from "@raycast/api";
import fs from "fs";
import path from "path";
import { DEFAULT_FORMAT_ID, getFormat } from "./formats";

/** Absolute path of the CSV file backing the extension. */
export const CSV_PATH = path.join(environment.supportPath, "qr-codes.csv");

const HEADER = ["creation date", "content", "type", "pinned"];

export interface QRCodeEntry {
  /** Row position in the CSV. Stable until the file changes, used to delete a row. */
  id: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  content: string;
  /** Symbology id; rows written before the column existed read back as QR. */
  format: string;
  /** Pinned entries are listed above the date sections. */
  pinned: boolean;
}

/** Minimal RFC 4180 parser: handles quoted fields, escaped quotes and embedded newlines. */
function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (inQuotes) {
      if (char === '"') {
        if (raw[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      endField();
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && raw[i + 1] === "\n") i++;
      endRow();
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) endRow();

  return rows;
}

function escapeField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function serializeCSV(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\n") + "\n";
}

function readRows(): string[][] {
  if (!fs.existsSync(CSV_PATH)) {
    // Create the empty file up front so it can be opened in Finder before the first save.
    writeRows([]);
    return [];
  }
  const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf-8"));
  const isHeader = rows[0]?.[0]?.trim().toLowerCase() === HEADER[0];
  // Rows written before the type column existed are padded here, so any write normalizes the file.
  return (isHeader ? rows.slice(1) : rows)
    .filter((row) => row.length >= 2)
    .map((row) => [row[0], row[1], getFormat(row[2]).id, row[3] === "true" ? "true" : "false"]);
}

function writeRows(rows: string[][]): void {
  fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
  const tmpPath = `${CSV_PATH}.tmp`;
  fs.writeFileSync(tmpPath, serializeCSV([HEADER, ...rows]), "utf-8");
  fs.renameSync(tmpPath, CSV_PATH);
}

/** All saved entries, newest first. */
export async function loadEntries(): Promise<QRCodeEntry[]> {
  return readRows()
    .map((row, index) => ({
      id: String(index),
      createdAt: row[0],
      content: row[1],
      format: getFormat(row[2]).id,
      pinned: row[3] === "true",
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addEntry(content: string, format: string = DEFAULT_FORMAT_ID): Promise<QRCodeEntry> {
  const entry: QRCodeEntry = {
    id: "",
    createdAt: new Date().toISOString(),
    content,
    format: getFormat(format).id,
    pinned: false,
  };
  const rows = readRows();
  rows.push([entry.createdAt, entry.content, entry.format, String(entry.pinned)]);
  writeRows(rows);
  entry.id = String(rows.length - 1);
  return entry;
}

/** The row an entry came from, falling back to a value match if the file changed meanwhile. */
function rowIndexOf(rows: string[][], entry: QRCodeEntry): number {
  const index = Number(entry.id);
  if (rows[index]?.[0] === entry.createdAt && rows[index]?.[1] === entry.content) return index;
  return rows.findIndex((row) => row[0] === entry.createdAt && row[1] === entry.content);
}

/** Replaces the content and type, and stamps the entry with the current date. */
export async function updateEntry(entry: QRCodeEntry, content: string, format: string): Promise<QRCodeEntry> {
  const rows = readRows();
  const index = rowIndexOf(rows, entry);
  const updated: QRCodeEntry = {
    id: entry.id,
    createdAt: new Date().toISOString(),
    content,
    format: getFormat(format).id,
    pinned: entry.pinned,
  };
  const row = [updated.createdAt, updated.content, updated.format, String(updated.pinned)];
  if (index === -1) {
    rows.push(row);
    updated.id = String(rows.length - 1);
  } else {
    rows[index] = row;
    updated.id = String(index);
  }
  writeRows(rows);
  return updated;
}

/** Pins or unpins an entry. The creation date is left alone — pinning is not an edit. */
export async function setPinned(entry: QRCodeEntry, pinned: boolean): Promise<void> {
  const rows = readRows();
  const index = rowIndexOf(rows, entry);
  if (index === -1) return;
  rows[index] = [rows[index][0], rows[index][1], rows[index][2], String(pinned)];
  writeRows(rows);
}

export async function deleteEntry(entry: QRCodeEntry): Promise<void> {
  const rows = readRows();
  const index = rowIndexOf(rows, entry);
  if (index === -1) return;
  writeRows(rows.filter((_, i) => i !== index));
}
