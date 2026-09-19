import type { DatabaseSync } from "node:sqlite";
import { Entry } from "./types";
import { ParsedQuery } from "./query";
import { buildFtsQuery, MIN_INDEX_TERM } from "./fts-query";
import { LIVE_RESULTS } from "./search-limits";

/**
 * Querying the index.
 *
 * One statement returns one bounded, already-filtered candidate set. Type,
 * date, size, extension and hidden-file filters are pushed into SQL so the
 * LIMIT selects from rows that could actually be shown, rather than discarding
 * most of the candidates afterwards. Usage ranking stays in JavaScript, where the visit
 * log lives.
 *
 * Nothing here reads the table without a LIMIT.
 */

export type IndexQueryResult = {
  entries: Entry[];
  /** True when the candidate limit cut the set short. */
  truncated: boolean;
  /** Set when the query could not run. */
  error?: string;
  /** True when the typed text was too short for the index. */
  tooShort: boolean;
  /** Milliseconds spent inside SQLite. */
  elapsedMs: number;
};

type Row = {
  path: string;
  name: string;
  is_dir: number;
  is_symlink: number;
  size: number;
  mtime_ms: number;
  birthtime_ms: number;
  storage_path: string | null;
};

function toEntry(row: Row): Entry {
  return {
    name: row.name,
    path: row.path,
    storagePath: row.storage_path ?? undefined,
    isDirectory: row.is_dir === 1,
    isSymlink: row.is_symlink === 1,
    size: row.size,
    mtimeMs: row.mtime_ms,
    birthtimeMs: row.birthtime_ms,
  };
}

const SELECTED =
  "f.path AS path, f.name AS name, f.is_dir AS is_dir, f.is_symlink AS is_symlink, " +
  "f.size AS size, f.mtime_ms AS mtime_ms, f.birthtime_ms AS birthtime_ms, f.storage_path AS storage_path";

type Binding = Record<string, string | number>;

/**
 * Build the filter clauses shared by both query shapes.
 *
 * These mirror `matchesStats`, which still runs in JavaScript over the merged
 * set: SQL narrows what the LIMIT chooses from, and the JavaScript pass remains
 * the single authority so memory results obey exactly the same rules.
 */
function filterClauses(parsed: ParsedQuery, showHidden: boolean) {
  const clauses: string[] = [];
  const bind: Binding = {};

  if (parsed.type === "directory") clauses.push("f.is_dir = 1");
  if (parsed.type === "file") clauses.push("f.is_dir = 0");

  if (parsed.after !== undefined) {
    clauses.push("f.mtime_ms >= :after");
    bind.after = parsed.after;
  }
  if (parsed.before !== undefined) {
    clauses.push("f.mtime_ms < :before");
    bind.before = parsed.before;
  }
  // A size bound is meaningless for a folder, so it excludes folders outright.
  if (parsed.minSize !== undefined) {
    clauses.push("f.is_dir = 0 AND f.size > :minSize");
    bind.minSize = parsed.minSize;
  }
  if (parsed.maxSize !== undefined) {
    clauses.push("f.is_dir = 0 AND f.size < :maxSize");
    bind.maxSize = parsed.maxSize;
  }

  if (parsed.extensions.length > 0) {
    // SQLite LIKE is ASCII case-insensitive, which matches the documented
    // case-insensitive extension rule. Suffix form supports .tar.gz.
    const parts = parsed.extensions.map((extension, index) => {
      bind[`ext${index}`] = `%.${extension}`;
      return `f.name LIKE :ext${index}`;
    });
    clauses.push(`(${parts.join(" OR ")})`);
  }

  // A dot-prefixed term already asks for hidden entries; parsed.hidden is
  // folded into showHidden by the caller.
  if (!showHidden) clauses.push("f.name NOT LIKE '.%'");

  return { clauses, bind };
}

/**
 * Rows whose filename matches every typed term by prefix.
 *
 * Ordering is `mtime_ms DESC`, which decides *which* 50 rows survive the
 * limit; the ranking the user sees is applied afterwards in JavaScript, where
 * the visit log lives. Recency is a meaningful proxy on its own, and it is
 * cheaper than bm25 on every query measured. Historical baseline over 510,832 paths at
 * LIMIT 501, p50/p95 in ms:
 *
 *   matching rows   mtime DESC        bm25       unordered
 *   9,322            8.56/9.57   14.33/15.20     0.31/0.40
 *   6,030            7.33/8.12   12.75/13.56     0.38/0.51
 *   4,105            5.19/5.73     8.44/9.31     0.49/0.62
 *   2,007            1.52/1.97     6.17/6.84     0.38/0.59
 *   1,135            1.07/1.28     2.22/2.64     0.41/0.52
 *
 * Cost tracks how many names match, not how many are indexed: both orderings
 * have to visit every match before they can pick 500, while the unordered
 * column shows what stopping at 501 arbitrary rows would cost. Unordered is
 * not used: it sacrifices recency-based candidate selection. Very broad terms
 * can still exceed the latency target. bm25 also has little to work
 * with here, since every term is a prefix over one short column.
 */
export function queryIndex(
  db: DatabaseSync,
  parsed: ParsedQuery,
  opts: {
    showHidden?: boolean;
    limit?: number;
  } = {},
): IndexQueryResult {
  // The default candidate cap. The caller merges memory results and caps again.
  const { showHidden = false, limit = LIVE_RESULTS } = opts;
  const started = performance.now();
  const fts = buildFtsQuery(parsed.tokens, MIN_INDEX_TERM);
  if (fts.match === undefined)
    return {
      entries: [],
      truncated: false,
      tooShort: fts.tooShort,
      elapsedMs: 0,
    };

  const { clauses, bind } = filterClauses(parsed, showHidden);
  const sql =
    `SELECT ${SELECTED} FROM files_fts ` +
    "JOIN files f ON f.id = files_fts.rowid " +
    "WHERE files_fts MATCH :match" +
    clauses.map((clause) => ` AND ${clause}`).join("") +
    " ORDER BY f.mtime_ms DESC LIMIT :limit";

  try {
    // One extra row distinguishes "exactly at the limit" from "truncated".
    const rows = db.prepare(sql).all({
      ...bind,
      match: fts.match,
      limit: limit + 1,
    }) as unknown as Row[];
    const truncated = rows.length > limit;
    return {
      entries: rows.slice(0, limit).map(toEntry),
      truncated,
      tooShort: false,
      elapsedMs: performance.now() - started,
    };
  } catch (error) {
    return {
      entries: [],
      truncated: false,
      tooShort: false,
      error: error instanceof Error ? error.message : String(error),
      elapsedMs: performance.now() - started,
    };
  }
}
