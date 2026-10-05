# SQL Reference Search Changelog

## [1.0.1] - 2026-03-12

- Removed custom dialect persistence via `LocalStorage` and now rely on Raycast dropdown `storeValue` as the single source of truth.
- Removed obsolete default-dialect action and deleted `src/lib/dialect-storage.ts`.
- Switched command preferences typing to auto-generated `Preferences.SqlLookup` from `raycast-env.d.ts`.
- Made dialect dropdown controlled with `value={selectedDialect}` to keep UI state and filtering state synchronized.
- Replaced unsafe dialect cast in dropdown `onChange` with validation against `DIALECT_ORDER`.
- Filtered all `View as ...` actions to entry-supported dialects only in both list and detail views.
- Updated preference description in `package.json` to match the new persistence behavior.

## [1.0.0] - 2026-03-12

- Added `SQL Lookup` command with weighted search scoring (title, alias, tags, summary).
- Added dialect-aware documentation rendering for PostgreSQL, MySQL, SQLite, and T-SQL.
- Added structured entry viewer and right-side preview with sections for summary, syntax, parameters, examples, notes, and related entries.
- Added copy actions for current dialect syntax and examples.
- Added optional per-entry dialect view switching and all-dialects comparison mode in detail view.
- Added static modular datasets:
  - `src/data/keywords.json`
  - `src/data/functions.json`
  - `src/data/patterns.json`
- Updated `SELECT` syntax to explicitly show optional `ORDER BY ... ASC|DESC`.
- Removed standalone `Set SQL Dialect` command in favor of the lookup dropdown workflow.
- Removed `Copy ANSI Syntax` action.
