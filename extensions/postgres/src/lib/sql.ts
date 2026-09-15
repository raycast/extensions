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
 * Functions that change something outside the rows they return.
 *
 * The `READ ONLY` transaction behind this classifier covers writes to *tables* — it is error 25006
 * on an INSERT, not a sandbox. PostgreSQL runs `SELECT pg_terminate_backend(…)`, `SELECT setval(…)`,
 * `SELECT pg_stat_reset()` and a `dblink` call inside a read-only transaction quite happily, so a
 * statement calling one of these would otherwise reach the server having asked nobody. Calling one
 * counts as a write here: the statement is routed to the write tool, which names the target
 * database and waits for the user.
 *
 * Grouped by what each one touches. Deliberately broad — a false positive costs a confirmation
 * prompt, a false negative costs a terminated backend.
 */
const SIDE_EFFECT_FUNCTION = new RegExp(
  "\\b(?:" +
    [
      // Other sessions.
      "pg_terminate_backend",
      "pg_cancel_backend",
      // Sequences and session state — both are exempt from the read-only transaction check.
      "setval",
      "nextval",
      "set_config",
      // Locks and signals that outlive the statement.
      "pg_\\w*advisory\\w*",
      "pg_notify",
      "pg_logical_emit_message",
      // Holds the connection for as long as it likes.
      "pg_sleep\\w*",
      // Throws away server statistics.
      "pg_stat_reset\\w*",
      // Reaches a different server entirely, where none of these gates apply.
      "dblink\\w*",
      // Large objects: pg_largeobject rows, and lo_import/lo_export touch the server filesystem.
      "lo_\\w+",
      "lowrite",
      // The server filesystem, outside the database altogether.
      "pg_read_file",
      "pg_read_binary_file",
      "pg_stat_file",
      "pg_ls_\\w+",
      "pg_file_\\w+",
      "pg_logdir_ls",
      // Server and WAL administration.
      "pg_reload_conf",
      "pg_rotate_logfile",
      "pg_promote",
      "pg_switch_wal",
      "pg_switch_xlog",
      "pg_create_restore_point",
      "pg_start_backup",
      "pg_stop_backup",
      "pg_backup_start",
      "pg_backup_stop",
      // Replication state. `pg_logical_slot_get_changes` consumes the slot; the `peek` variants do not.
      "pg_drop_replication_slot",
      "pg_copy_logical_replication_slot",
      "pg_copy_physical_replication_slot",
      "pg_create_logical_replication_slot",
      "pg_create_physical_replication_slot",
      "pg_replication_slot_advance",
      "pg_logical_slot_get\\w*",
      "pg_replication_origin\\w*",
      // Runs the SQL handed to it, which is not the SQL that was classified.
      "query_to_xml\\w*",
      "pg_import_system_collations",
    ].join("|") +
    ")\\s*\\(",
  "i",
);

/**
 * True when the statement calls one of {@link SIDE_EFFECT_FUNCTION}.
 *
 * Runs against a rewrite that keeps quoted identifiers, which the normalized form blanks:
 * `SELECT "pg_terminate_backend"(…)` is a legal call, and checking the normalized text alone would
 * never see it. String literals stay blanked, so a function name that only appears inside a value
 * — `WHERE note = 'run setval(…) tomorrow'` — is still just data. The match needs a `(` after the
 * name, so an identifier that merely shares a name with one of these is not a call.
 */
function callsSideEffectFunction(sql: string): boolean {
  return SIDE_EFFECT_FUNCTION.test(stripLiterals(sql, { keepIdentifiers: true }));
}

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
 *
 * `keepIdentifiers` unquotes quoted identifiers instead of blanking them, which is what the
 * side-effect function check needs and what keyword classification must not have.
 */
function stripLiterals(sql: string, options: { keepIdentifiers?: boolean } = {}): string {
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
      const start = ++i;
      let closed = false;
      while (i < n) {
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        i++;
      }
      // `i` sits past the closing quote, so the body stops one short of it.
      const body = sql.slice(start, closed ? i - 1 : n).replace(/""/g, '"');
      out += options.keepIdentifiers ? body : " ";
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
 * no side-effecting function call, and no second statement. Everything else — including anything
 * ambiguous — is treated as a write.
 */
export function isReadOnly(sql: string): boolean {
  const normalized = normalizeForClassification(sql).replace(/;\s*$/, "");
  if (normalized.length === 0) return false;
  // A `;` left after trimming the trailing one means a second statement is riding along.
  if (normalized.includes(";")) return false;
  if (!READ_ONLY_PREFIX.test(normalized)) return false;
  if (WRITE_KEYWORD.test(normalized)) return false;
  if (SELECT_INTO.test(normalized)) return false;
  if (callsSideEffectFunction(sql)) return false;
  return true;
}

/**
 * True when `DECLARE … CURSOR FOR <statement>` accepts the statement, which is what lets the Row
 * Limit stop a fetch early instead of slicing a result the driver has already pulled in full.
 *
 * Only the row-returning forms qualify. `SHOW`, `EXPLAIN` and `FETCH` all begin a read, but none of
 * them can be wrapped in a cursor, so they keep taking the plain path.
 */
export function isCursorEligible(sql: string): boolean {
  return /^\s*(select|with|table|values)\b/i.test(normalizeForClassification(sql));
}

/** Quotes an identifier for interpolation into SQL, escaping embedded double quotes. */
export function quoteIdent(identifier: string): string {
  return '"' + identifier.replace(/"/g, '""') + '"';
}

/** `schema.table`, each part quoted. */
export function qualify(schema: string, table: string): string {
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}
