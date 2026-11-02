# integrations.sh Changelog

## [Surface Actions and Search Cancellation] - 2026-10-12

- Added per-surface actions to copy MCP endpoint URLs, copy npm or Homebrew install commands, and open the credential pages referenced by each surface.
- Omitted unavailable actions when endpoint URLs, supported package metadata, or credential pages are missing.
- Cancelled superseded searches and requests on exit, keeping stale responses and failures from replacing the latest search.

## [Initial Version] - 2026-07-06
