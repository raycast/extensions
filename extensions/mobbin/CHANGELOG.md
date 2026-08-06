# Mobbin Search Changelog

## [Initial Release] - 2026-07-29

- Make OAuth MCP the default for new installations while preserving existing
  saved preferences.
- Add dedicated **Search Mobbin Flows** and **Search Mobbin Sections** commands.
- Add capability-aware exact MCP tool discovery, persistent command-session
  connections, cancellation, reconnect, schema-driven arguments, and
  structured response normalization.
- Stabilize REST and MCP search with query validation, 60-second timeouts,
  abortable rate-limit retry, in-flight deduplication, and a bounded two-minute
  cache.
- Add versioned migration and runtime validation for legacy favorites and
  history.
- Store favorite images persistently, isolate temporary image caching, write
  unique files to `~/Downloads`, and enforce HTTPS/type/size/timeout checks.
- Render result metadata immediately, load remote images through a cancellable
  one-at-a-time queue, and use larger two-column reference grids.
- Refactor the search UI into a shared controller, grids, options, global
  actions, result actions, and flow detail views.
- Add expiring-image warnings, query guidance, platform-aware layouts, complete
  OAuth connection actions, and server-side revocation access.
- Expand automated coverage for transports, storage, images, and UI behavior.
