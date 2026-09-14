/**
 * Classifies a statement as read-only or not.
 *
 * This decides whether the AI may run something without asking the user, so it fails closed:
 * anything it cannot confidently prove to be a read counts as a write. It is the *first* of two
 * gates — `runQuery({ readOnly: true })` additionally runs the statement inside a `READ ONLY`
 * transaction, so a write this classifier missed is still refused by the server.
 */

/** A statement must *start* with one of these to be a candidate for read-only. */
const READ_ONLY_PREFIX = /^\s*(select|with|show|table|values|fetch|explain)\b/i;

/**
 * Any of these anywhere in the statement disqualifies it. `with` can carry a data-modifying CTE
 * (`WITH x AS (DELETE … RETURNING *) SELECT …`), and `explain` can carry `ANALYZE`, which really
 * executes the statement — so a prefix check alone is not enough.
 */
const WRITE_KEYWORD =
  /\b(insert|update|delete|merge|create|drop|alter|truncate|rename|grant|revoke|copy|call|do|vacuum|analyze|reindex|refresh|cluster|comment|import|lock|notify|listen|unlisten|prepare|execute|deallocate|discard|checkpoint|reassign|security|set|reset|begin|start|commit|rollback|savepoint|release|close|declare|move)\b/i;

/** `SELECT … INTO new_table` creates a table in PostgreSQL, so it is never a plain read. */
const SELECT_INTO = /\binto\b/i;

/**
 * Rewrites a statement for classification: comments are removed and the contents of every
 * literal are blanked, so a keyword that lives inside a quoted value counts as data rather than
 * as SQL. Handles the three PostgreSQL literal forms that can hide one:
 *
 * - `'…'` (doubled `''` escapes the quote) and `E'…'` (backslash escapes as well)
 * - `"…"` quoted identifiers (doubled `""` escapes)
 * - `$tag$…$tag$` dollar quoting, where the body is opaque and may contain anything
 *
 * Block comments nest in PostgreSQL, so the depth is tracked rather than scanning for the first closer.
 */
function stripLiterals(sql: string): string {
  let out = "";
  const n = sql.length;
  let i = 0;

  while (i < n) {
    const ch = sql[i];
    const next = i + 1 < n ? sql[i + 1] : "";

    // Dollar-quoted string: $$…$$ or $tag$…$tag$. The tag is [A-Za-z_][A-Za-z0-9_]*.
    if (ch === "$") {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (tag) {
        const delimiter = tag[0];
        const end = sql.indexOf(delimiter, i + delimiter.length);
        i = end === -1 ? n : end + delimiter.length; // unterminated: swallow the rest
        out += " ";
        continue;
      }
      // Not a dollar quote — a positional parameter such as $1. Keep it.
      out += ch;
      i++;
      continue;
    }

    // Single-quoted string. A preceding E/e (and the PostgreSQL default of standard_conforming_strings
    // being on) decides whether a backslash escapes the next character; scanning E-strings with
    // backslash escaping is the stricter reading, so only E-strings honor it.
    if (ch === "'") {
      const escapeBackslash = i > 0 && /[Ee]/.test(sql[i - 1]) && !/[A-Za-z0-9_]/.test(sql[i - 2] ?? " ");
      i++;
      while (i < n) {
        const c = sql[i];
        if (escapeBackslash && c === "\\") {
          i += 2;
          continue;
        }
        if (c === "'") {
          if (sql[i + 1] === "'") {
            i += 2; // doubled quote escapes the quote
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      out += " ";
      continue;
    }

    // Quoted identifier.
    if (ch === '"') {
      i++;
      while (i < n) {
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      out += " ";
      continue;
    }

    // Nestable block comment.
    if (ch === "/" && next === "*") {
      let depth = 0;
      while (i < n) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
          continue;
        }
        if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
          if (depth === 0) break;
          continue;
        }
        i++;
      }
      out += " ";
      continue;
    }

    // Line comment.
    if (ch === "-" && next === "-") {
      while (i < n && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}

/** The statement with comments removed and literals blanked — also used to detect multiple statements. */
export function normalizeForClassification(sql: string): string {
  return stripLiterals(sql).trim();
}

/**
 * True only when the statement starts with a read verb and contains no write keyword, no `INTO`,
 * and no second statement. Everything else — including anything ambiguous — is treated as a write.
 */
export function isReadOnly(sql: string): boolean {
  const normalized = normalizeForClassification(sql).replace(/;\s*$/, "");
  if (normalized.length === 0) return false;
  // A `;` left after trimming the trailing one means a second statement is riding along.
  if (normalized.includes(";")) return false;
  if (!READ_ONLY_PREFIX.test(normalized)) return false;
  if (WRITE_KEYWORD.test(normalized)) return false;
  if (SELECT_INTO.test(normalized)) return false;
  return true;
}

/** Quotes an identifier for interpolation into SQL, escaping embedded double quotes. */
export function quoteIdent(identifier: string): string {
  return '"' + identifier.replace(/"/g, '""') + '"';
}

/** `schema.table`, each part quoted. */
export function qualify(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}
