import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { v4 as uuidv4, validate as uuidValidate } from "uuid";

const DB_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "Wispr Flow",
  "flow.sqlite",
);
const NULL_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Escapes a string for safe use in SQLite queries.
 * - Doubles single quotes (SQL standard escaping)
 * - Removes null bytes which can truncate strings
 * - Limits length to prevent DoS
 */
function escapeString(value: string, maxLength = 1000): string {
  return value.slice(0, maxLength).replace(/\0/g, "").replace(/'/g, "''");
}

/**
 * Validates that a string is a valid UUID to prevent injection in ID fields.
 */
function validateUuid(id: string): string {
  if (!uuidValidate(id)) {
    throw new Error("Invalid UUID");
  }
  return id;
}

export interface DictionaryEntry {
  id: string;
  phrase: string;
  replacement: string | null;
  manualEntry: boolean;
  source: string;
  frequencyUsed: number;
  createdAt: string;
  modifiedAt: string;
  isDeleted: boolean;
}

function runQuery(sql: string): string {
  return execSync(`sqlite3 "${DB_PATH}"`, {
    encoding: "utf-8",
    input: sql,
  });
}

function runQueryJson(sql: string): Record<string, unknown>[] {
  const result = execSync(`sqlite3 -json "${DB_PATH}"`, {
    encoding: "utf-8",
    input: sql,
  });
  if (!result.trim()) return [];
  return JSON.parse(result);
}

export function getAllWords(): DictionaryEntry[] {
  const rows = runQueryJson(`
    SELECT id, phrase, replacement, manualEntry, source, frequencyUsed, createdAt, modifiedAt, isDeleted
    FROM Dictionary
    WHERE isDeleted = 0
    ORDER BY createdAt DESC
  `);

  return rows.map((row) => ({
    id: row.id as string,
    phrase: row.phrase as string,
    replacement: (row.replacement as string) || null,
    manualEntry: row.manualEntry === 1,
    source: row.source as string,
    frequencyUsed: row.frequencyUsed as number,
    createdAt: row.createdAt as string,
    modifiedAt: row.modifiedAt as string,
    isDeleted: row.isDeleted === 1,
  }));
}

function formatDateForWispr(date: Date): string {
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const y = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms} +00:00`;
}

export function addWord(phrase: string, replacement?: string): DictionaryEntry {
  const now = formatDateForWispr(new Date());
  const id = uuidv4();
  const escapedPhrase = escapeString(phrase, 255);
  const replacementValue = replacement
    ? `'${escapeString(replacement, 255)}'`
    : "NULL";

  runQuery(`
    INSERT INTO Dictionary (id, phrase, replacement, teamDictionaryId, lastUsed, frequencyUsed, remoteFrequencyUsed, manualEntry, createdAt, modifiedAt, isDeleted, source, isSnippet, observedSource)
    VALUES ('${id}', '${escapedPhrase}', ${replacementValue}, '${NULL_UUID}', NULL, 0, 0, 1, '${now}', '${now}', 0, 'manual', 0, NULL)
  `);

  return {
    id,
    phrase,
    replacement: replacement || null,
    manualEntry: true,
    source: "manual",
    frequencyUsed: 0,
    createdAt: now,
    modifiedAt: now,
    isDeleted: false,
  };
}

export function deleteWord(id: string): void {
  const validId = validateUuid(id);
  const now = formatDateForWispr(new Date());
  runQuery(
    `UPDATE Dictionary SET isDeleted = 1, modifiedAt = '${now}' WHERE id = '${validId}'`,
  );
}

export function updateWord(
  id: string,
  phrase: string,
  replacement?: string,
): void {
  const validId = validateUuid(id);
  const now = formatDateForWispr(new Date());
  const escapedPhrase = escapeString(phrase, 255);
  const replacementValue = replacement
    ? `'${escapeString(replacement, 255)}'`
    : "NULL";
  runQuery(
    `UPDATE Dictionary SET phrase = '${escapedPhrase}', replacement = ${replacementValue}, modifiedAt = '${now}' WHERE id = '${validId}'`,
  );
}

export function wordExists(phrase: string): boolean {
  const escapedPhrase = escapeString(phrase, 255);
  const rows = runQueryJson(
    `SELECT id FROM Dictionary WHERE phrase = '${escapedPhrase}' AND isDeleted = 0 LIMIT 1`,
  );
  return rows.length > 0;
}
