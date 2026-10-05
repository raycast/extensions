// PURE: how querySqlite opens an app's database without writing to it.
//
// Apps keep their databases in WAL mode (Codex's state_N.sqlite, Cursor's state.vscdb). A read-only connection
// to a WAL database needs its -shm file, which only exists while the app holds a connection open: when the last
// one closes, SQLite checkpoints the WAL into the database and deletes -wal and -shm. Then `sqlite3 -readonly`
// fails with "unable to open database file (14)" (SQLITE_CANTOPEN) because it may not create -shm. Opening
// read-write would create those files in the app's folder, which agent sources never do (ADR-022). With no -wal
// file every commit is in the database file itself, so it's read as immutable: no -shm, no locks. Immutable
// ignores a WAL, so it's only for that case: while the app has the database open, -readonly works and sees the
// WAL (ADR-031).

/** The failure of opening a WAL database read-only while no connection holds it (and so no -shm exists). */
export const isCantOpen = (error: unknown): boolean =>
  error instanceof Error && /unable to open database file/.test(error.message);

/** An SQLite URI that opens `path` read-only as immutable; path segments are escaped (`?`, `#`, `%`, spaces). */
export const immutableUri = (path: string): string =>
  `file:${path.split("/").map(encodeURIComponent).join("/")}?mode=ro&immutable=1`;
