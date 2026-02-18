# Polars Documentation Search Changelog

## [1.0.1] - {PR_MERGE_DATE}

- Expanded alias mode to shorten common Polars names in rendered docs text:
- `polars.` -> `pl.`
- `DataFrame` -> `df`
- `Series` -> `s`
- `LazyFrame` / `LazyDataFrame` -> `lf`
- Updated object method signatures to use instance-style aliases (for example, `pl.DataFrame.select(...)` -> `df.select(...)`).

## [1.0.0] - {PR_MERGE_DATE}

- Added a full in-extension Polars API docs search and detail viewer backed by the official `objects.inv`.
- Added symbol ranking, in-panel detail preview, full-screen detail view, and quick actions for URL/name/signature copy.
- Added user preferences to display symbols with `pl.` prefix and optionally hide entries that start with `api`.
