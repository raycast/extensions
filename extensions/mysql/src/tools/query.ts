import { Action, Tool } from "@raycast/api";
import { runQuery } from "../lib/client";
import { getActiveConnection } from "../lib/connections";
import { isRows, summarizeWrite } from "../lib/format";

type Input = {
  /** The SQL statement to run, e.g. "SELECT * FROM users LIMIT 10". */
  sql: string;
};

// Cap the rows returned to the model so a large SELECT doesn't overflow the context window.
const MAX_TOOL_ROWS = 100;

const READ_ONLY_PREFIX = /^\s*(select|show|describe|desc|explain)\b/i;
const WRITE_KEYWORD =
  /\b(insert|update|delete|replace|merge|create|drop|alter|truncate|rename|grant|revoke|call|set|load)\b/i;

// `SELECT … INTO OUTFILE/DUMPFILE` writes to the filesystem, so it is never read-only.
const FILE_WRITE = /\binto\s+(outfile|dumpfile)\b/i;

// Rewrites SQL for classification with a single, string-literal-aware pass so a write keyword
// or file-write clause can't be hidden behind a comment marker or inside a quoted value. Comments
// are removed and the contents of string ('…', "…") and identifier (`…`) literals are blanked —
// a `#`, `--`, or `INTO OUTFILE` that lives inside a quoted value is data, not SQL. MySQL executable
// comments (/*! … */) run on the server, so their inner SQL is kept (only the delimiters are dropped).
//
// Whether a backslash escapes the following quote depends on the server's NO_BACKSLASH_ESCAPES
// SQL mode, which we can't know here, so `escapeBackslash` lets `isReadOnly` scan both ways and
// only trust a read-only verdict when both agree (see below).
function stripComments(sql: string, escapeBackslash: boolean): string {
  let out = "";
  const n = sql.length;
  let i = 0;
  while (i < n) {
    const ch = sql[i];
    const next = i + 1 < n ? sql[i + 1] : "";

    // Quoted string or identifier: blank the contents so markers/keywords inside count as data.
    if (ch === "'" || ch === '"' || ch === "`") {
      const quote = ch;
      i++;
      while (i < n) {
        const c = sql[i];
        if (escapeBackslash && c === "\\" && quote !== "`") {
          i += 2; // backslash escape (only when the session honors it; never for backtick identifiers)
          continue;
        }
        if (c === quote) {
          if (sql[i + 1] === quote) {
            i += 2; // doubled quote is an escaped quote within the literal
            continue;
          }
          i++; // closing quote
          break;
        }
        i++;
      }
      out += " ";
      continue;
    }

    // Executable comment /*! … */ opener: keep the inner SQL, drop only the `/*!<version>` marker.
    if (ch === "/" && next === "*" && sql[i + 2] === "!") {
      i += 3;
      while (i < n && sql[i] >= "0" && sql[i] <= "9") i++; // optional version digits
      out += " ";
      continue;
    }

    // Ordinary block comment /* … */: remove entirely.
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      out += " ";
      continue;
    }

    // Executable-comment closer left behind after keeping its inner SQL.
    if (ch === "*" && next === "/") {
      i += 2;
      out += " ";
      continue;
    }

    // Line comment: `#` to end of line, or `--` when followed by whitespace/EOL (per MySQL).
    if (ch === "#" || (ch === "-" && next === "-" && (i + 2 >= n || /\s/.test(sql[i + 2])))) {
      while (i < n && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

function classifiesReadOnly(sql: string, escapeBackslash: boolean): boolean {
  const trimmed = stripComments(sql, escapeBackslash).trim();
  if (FILE_WRITE.test(trimmed) || WRITE_KEYWORD.test(trimmed)) return false;
  return READ_ONLY_PREFIX.test(trimmed) || /^\s*with\b/i.test(trimmed);
}

/**
 * Read-only iff it starts with a read verb (or a CTE) and contains no write keyword or file write.
 * Backslash escaping hinges on the server's NO_BACKSLASH_ESCAPES SQL mode, so we scan both ways and
 * require both to agree — a statement is treated as read-only only when neither interpretation of the
 * quoting can reveal a hidden write. Ambiguity fails closed (confirmation required).
 */
function isReadOnly(sql: string): boolean {
  return classifiesReadOnly(sql, true) && classifiesReadOnly(sql, false);
}

/** Confirm before running anything that isn't clearly read-only. */
export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (isReadOnly(input.sql)) return undefined;
  const connection = await getActiveConnection();
  return {
    style: Action.Style.Destructive,
    message: "Run this statement against MySQL?",
    info: [
      { name: "Connection", value: connection?.name },
      { name: "SQL", value: input.sql },
    ],
  };
};

/**
 * Runs a SQL statement against the active MySQL connection (the default saved connection,
 * or the preferences fallback) and returns the rows or a write summary.
 */
export default async function (input: Input) {
  const connection = await getActiveConnection();
  if (!connection) {
    throw new Error("No MySQL connection configured. Add one with the Manage Connections command.");
  }

  // Statements classified read-only skipped confirmation, so run them under a read-only transaction:
  // if that classification was wrong (e.g. a write hidden in a stored function), the server blocks it.
  const result = await runQuery(connection, input.sql, { readOnly: isReadOnly(input.sql) });
  if (isRows(result.rows)) {
    // Cap the rows handed back to the model so a large result set doesn't blow up the context.
    const truncated = result.rows.length > MAX_TOOL_ROWS;
    return {
      connection: connection.name,
      rowCount: result.rows.length,
      durationMs: result.durationMs,
      truncated,
      rows: truncated ? result.rows.slice(0, MAX_TOOL_ROWS) : result.rows,
    };
  }
  return { connection: connection.name, durationMs: result.durationMs, result: summarizeWrite(result.rows) };
}
