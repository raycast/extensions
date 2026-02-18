# SQL Reference Search Changelog

## [1.0.0] - 2026-02-18

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
