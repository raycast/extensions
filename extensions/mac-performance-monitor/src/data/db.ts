/**
 * Low-level access to the Mac Performance Monitor database.
 *
 * The app writes a SQLite file. This module reads it by launching the
 * macOS `sqlite3` command-line tool in read-only mode and parsing the JSON it
 * prints. Nothing here knows about tables or columns; see queries.ts for that.
 */

import { execFile } from "child_process";
import os from "os";
import path from "path";
import { promisify } from "util";

// Turns the callback-style execFile into one we can `await`.
const execFileAsync = promisify(execFile);

const DATABASE_PATH = path.join(
  os.homedir(),
  "Library/Application Support/MacPerformanceMonitor/macperfmonitor.sqlite",
);

/**
 * Runs one read-only SQL query and returns the rows as objects.
 *
 * The database is opened with `-readonly` and `mode=ro` so the extension can
 * never take a write lock away from the recorder. Throws if sqlite3 fails.
 *
 * T describes the shape of one row, matching the column names in the query.
 */
export async function querySqlite<T>(sql: string): Promise<T[]> {
  const result = await execFileAsync(
    "/usr/bin/sqlite3",
    ["-readonly", "-json", "file:" + DATABASE_PATH + "?mode=ro", sql],
    { timeout: 4000, maxBuffer: 16 * 1024 * 1024 },
  );

  // sqlite3 prints nothing when a query has no rows.
  if (result.stdout.trim().length === 0) {
    return [];
  }

  return JSON.parse(result.stdout) as T[];
}
