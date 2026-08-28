## [Fixes] - 2026-08-04

### Fixed

- Search no longer fails with HTTP 403 when Downdetector's `/search/` endpoint is blocked by Cloudflare; the extension now falls through to the direct `/status/{slug}` lookup.

## [Initial Release] - 2026-07-28

### Added

- Initial release: search any service on Downdetector, view 24h status chart, and submit problem reports
