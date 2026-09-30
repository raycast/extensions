import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { resolveIndexDbPath } from "./paths";

const execFileAsync = promisify(execFile);

const SQLITE3_BIN = "/usr/bin/sqlite3";

/** Hard ceiling on rows returned per search — covers any realistic UI and stays well under maxBuffer. */
const SEARCH_LIMIT = 500;

/** Safety net for `execFile` stdout buffering (default is 1 MiB, easy to overflow on common short queries). */
const MAX_BUFFER = 16 * 1024 * 1024;

/** A single row from the `text_index` table. */
export interface IndexRow {
    id: string;
    content: string;
}

/**
 * Escapes a user-supplied search term so it can be safely embedded inside a
 * single-quoted SQL string literal used with `LIKE ... ESCAPE '\'`.
 *
 * Because we shell out to the sqlite3 CLI we cannot use bound parameters, so we
 * must neutralise everything that could otherwise change the query's meaning:
 *
 *   - backslash  -> escaped first so it does not double-escape our own escapes
 *                   (it is also the LIKE ESCAPE character)
 *   - single quote -> doubled, the SQL standard way to escape `'` inside a literal
 *   - `%` and `_` -> LIKE wildcards; escaped so the term is matched literally
 *
 * The result is meant to be wrapped as: '%' || '<escaped>' || '%'
 */
export function escapeLikeTerm(term: string): string {
    return term
        .replace(/\\/g, "\\\\") // escape backslash (our ESCAPE char) FIRST
        .replace(/'/g, "''") // escape single quotes for the SQL string literal
        .replace(/%/g, "\\%") // escape LIKE wildcard
        .replace(/_/g, "\\_"); // escape LIKE wildcard
}

/**
 * Builds the exact search SQL, mirroring the oh-shoot app:
 * case-insensitive (ASCII) substring match on the raw OCR content.
 * Caps results at {@link SEARCH_LIMIT} so the sqlite3 child process can't
 * overflow its stdout buffer on a common-letter query.
 */
export function buildSearchSql(term: string): string {
    const escaped = escapeLikeTerm(term);
    return `SELECT id, content FROM text_index WHERE content LIKE '%' || '${escaped}' || '%' ESCAPE '\\' LIMIT ${SEARCH_LIMIT};`;
}

function isIndexRowArray(value: unknown): value is IndexRow[] {
    if (!Array.isArray(value)) {
        return false;
    }
    for (const row of value) {
        if (typeof row !== "object" || row === null) {
            return false;
        }
        const { id, content } = row as Record<string, unknown>;
        if (typeof id !== "string" || typeof content !== "string") {
            return false;
        }
    }
    return true;
}

/**
 * Runs a case-insensitive substring search against the OCR index database by
 * shelling out to the macOS built-in sqlite3 binary in READ-ONLY mode and
 * parsing its JSON output. Returns `[]` (rather than throwing) when no DB is
 * present so the UI can render its "not found" empty state instead of a toast.
 */
export async function searchIndex(term: string): Promise<IndexRow[]> {
    const trimmed = term.trim();
    if (trimmed.length === 0) {
        return [];
    }

    const dbPath = resolveIndexDbPath();
    if (!dbPath) {
        return [];
    }

    const sql = buildSearchSql(trimmed);

    const { stdout } = await execFileAsync(SQLITE3_BIN, ["-readonly", "-json", dbPath, sql], {
        maxBuffer: MAX_BUFFER,
    });

    const text = stdout.trim();
    if (text.length === 0) {
        // sqlite3 -json prints nothing when there are zero rows.
        return [];
    }

    const parsed: unknown = JSON.parse(text);
    if (!isIndexRowArray(parsed)) {
        throw new Error("Unexpected sqlite3 output shape — expected an array of {id, content}.");
    }
    return parsed;
}
