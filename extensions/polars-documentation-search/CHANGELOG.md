# Polars Documentation Search Changelog

## [1.0.3] - 2026-03-02

- Fixed objects inventory parsing to handle arbitrary whitespace between fields and validate malformed lines.
- Fixed inline code markdown conversion to replace exact `<code>` nodes reliably in Cheerio traversal.

## [1.0.2] - 2026-03-02

- Fixed documentation error markdown to render real line breaks instead of literal `\n`.
- Made full-screen documentation view fetch details when needed so it no longer gets stuck on loading fallback content.
- Preserved anchor fragments in documentation URLs for accurate deep-link browser navigation and copied URLs.
- Improved inventory parsing resiliency with clearer header errors and non-blocking decompression.
- Improved search responsiveness by maintaining only top-ranked matches instead of sorting every candidate.
- Removed manual preferences typing in favor of Raycast's generated `Preferences` type.

## [1.0.1] - 2026-03-02

- Expanded alias mode to shorten common Polars names in rendered docs text:
- `polars.` -> `pl.`
- `DataFrame` -> `df`
- `Series` -> `s`
- `LazyFrame` / `LazyDataFrame` -> `lf`
- Updated object method signatures to use instance-style aliases (for example, `pl.DataFrame.select(...)` -> `df.select(...)`).

## [1.0.0] - 2026-03-02

- Added a full in-extension Polars API docs search and detail viewer backed by the official `objects.inv`.
- Added symbol ranking, in-panel detail preview, full-screen detail view, and quick actions for URL/name/signature copy.
- Added user preferences to display symbols with `pl.` prefix and optionally hide entries that start with `api`.
