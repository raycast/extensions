# OpenCodex Usage Changelog

## [Initial Version] - 2026-08-13

- Provider Usage command listing every connected provider with quota rings, reset times, adapter details and request/token/cost stats.
- Usage Stats command with summary totals, a per-day request sparkline, and per-provider, per-model and per-day breakdowns.
- Usage in Menu Bar command showing the provider under most pressure, refreshed every 10 minutes.
- Plain-language pace hints comparing quota consumed against time elapsed in the window.
- Menu bar shortcut to open the OpenCodex dashboard in the browser.
- Menu bar ring rendered in 5% steps, with light and dark variants.
- Bundled vendor logos for 39 providers.
- Admin-token support for opencodex builds that require one on `/api/*`, read automatically from `~/.opencodex/admin-api-token` or set in preferences.
