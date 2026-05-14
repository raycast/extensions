# SQL Reference Search

Dialect-aware SQL reference for Raycast with fast offline lookup.

## Features

- SQL Lookup command across keywords, clauses, functions, operators, datatypes, and patterns
- Dialect-aware rendering for PostgreSQL, MySQL, SQLite, and T-SQL
- Weighted search ranking (title/alias/tag/summary with type priority)
- Structured docs sections: Summary, Syntax, Parameters, Examples, Notes, Related
- Full right-side preview showing the same content as full description view
- Copy actions for current dialect syntax and examples

## Data Model

All reference data is stored locally for fast offline access.

Each entry includes `title`, `type`, `summary`, `syntax`, `examples`, `notes`, `aliases`, `tags`, `related`, and `dialects`.
