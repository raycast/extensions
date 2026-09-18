import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { InputError, normalizeTanzanianPhone, parseRecipientValues } from "./lib.js";

const PHONE_HEADERS = new Set([
  "phone",
  "phone_number",
  "phone number",
  "phonenumber",
  "numbers",
  "recipient",
  "msisdn",
]);

export async function parseRecipientFile(filePath: string): Promise<string[]> {
  const resolvedPath = resolveFilePath(filePath);
  await assertCsvFile(resolvedPath);

  let text: string;
  try {
    text = await readFile(resolvedPath, "utf8");
  } catch {
    throw new InputError("The selected file could not be read.");
  }

  const rows = parseCsv(text).filter((row) => row.some(Boolean));

  if (!rows.length) {
    throw new InputError("The selected file is empty.");
  }

  const firstRow = rows[0];
  const phoneColumn = firstRow.findIndex((value) => PHONE_HEADERS.has(normalizeHeader(value)));

  if (phoneColumn >= 0) {
    return parseRecipientValues(rows.slice(1).map((row) => row[phoneColumn] ?? ""));
  }

  if (!isPhoneNumber(firstRow[0] ?? "")) {
    throw new InputError("Add a supported phone-number header or put numbers in the first column.");
  }

  return parseRecipientValues(rows.map((row) => row[0] ?? ""));
}

function resolveFilePath(filePath: string): string {
  return filePath.startsWith("file:") ? fileURLToPath(filePath) : filePath;
}

async function assertCsvFile(filePath: string): Promise<void> {
  const extension = extname(filePath).toLowerCase();
  if (extension === ".csv") return;
  if (extension === ".xlsx") {
    throw new InputError("XLSX files are not supported. Export the file as CSV, then select it.");
  }
  if (extension === ".numbers") {
    throw new InputError("Apple Numbers files are not supported. Export the file as CSV, then select it.");
  }
  if (extension) throw new InputError("Choose a CSV file.");

  try {
    const content = await readFile(filePath);
    if (content.length && !content.includes(0)) return;
  } catch {
    // Let the user know this item is not a readable supported file.
  }

  throw new InputError("Choose a CSV file.");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell.trim());
  rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isPhoneNumber(value: string): boolean {
  try {
    normalizeTanzanianPhone(value);
    return true;
  } catch {
    return false;
  }
}
