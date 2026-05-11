# Google Cloud CLI Changelog

## [1.1.0] - 2026-04-16

### New Features
- Added **Settings & Configuration** command — list, switch, create, duplicate, and delete named gcloud configurations
- Added **Open Logs in IDE** action — exports visible log entries to a file and opens in your preferred editor
- Added **time range filter** for Logging — filter by last 15 min, 1h, 6h, 24h, or 7 days
- Added **Default Region** preference — pre-fills region in all create forms
- Added **Default IDE** app picker preference

### Improvements
- Friendlier error messages with actionable hints across all service views
- Cache eviction (max 200 entries) prevents unbounded memory growth
- Timeouts on all gcloud CLI calls prevent UI hangs
- Reduced auth/project cache TTL from 72 hours to 6 hours for fresher state
- Config name validation to prevent invalid characters
- Log search now filters client-side for faster, more predictable results — trades full server-side corpus search for instant filtering of the fetched entries
- Retry backoff now uses jitter to avoid thundering herd
- Safe JSON parsing — malformed gcloud output no longer crashes the extension

### Bug Fixes
- Fixed configuration activation failing when gcloud emits project-mismatch warnings
- Fixed configuration creation failing on retry after partial success
- Fixed Cloud Functions and Storage views not refetching when project changes
- Fixed reserved Raycast keyboard shortcuts (Cmd+A, Cmd+Delete) causing warnings
- Removed unused static regionsCache from NetworkService
- Fixed N+1 API calls in ServiceHubService.isServiceEnabled

## [1.0.4] - 2026-02-10
- Fixed JS heap out-of-memory crash in index command by limiting API response payloads
- Deduplicated IAM policy modification logic into a single reusable method
- Removed dead code, orphaned files, and unused `dotenv` dependency

## [1.0.3] - 2026-01-13
- Added Cloud Shell SSH connection action across all views
- Added keyboard shortcut (Cmd+Opt+S) to copy Cloud Shell connection command
- Improved action component error handling and input validation

## [1.0.2] - 2026-01-05
- Added Cloud Functions v2 service with Gen 2 support
- Added function invocation from Raycast with live response
- Added function creation form with streaming deployment logs
- Added ApiErrorView for consistent API error handling across services
- Improved service consistency and error handling patterns
- Improved IAMService, SecretManagerService, CloudBuildService, ComputeService

## [1.0.1] - 2025-12-28
- Added optimistic UI updates for VM start/stop actions
- Fixed Streamer Mode not hiding "Copy Latest Value" action in Secrets list
- Fixed Streamer Mode toggle not updating secret value display in real-time
- Allow copying secrets even when Streamer Mode is enabled (display remains masked)
- Redesigned Secret detail view to match design patterns (metadata sidebar, tables)

## [1.0.0] - 2025-12-15
- Added Streamer Mode - hide sensitive data (emails, IPs, secrets) with Cmd+Shift+H
- Added Windows compatibility
- Added Cloud Run service support
- Added Cloud Logging service support
- Added Doctor view for diagnostics and troubleshooting gcloud setup
- Added REST API layer for faster performance
- Added gcloud CLI auto-detection - no more manual path configuration required
- Removed redundant per-service commands, improving ergonomics
- Improved error handling
- Improved UI and date formatting

## [0.1.32] - 2025-07-08
- Add Secret Manager command for managing Google Cloud secrets
- Add secure secret value viewing with confirmation dialogs
- Add version management for secrets (create, enable, disable, destroy)
- Add search and filtering capabilities for secrets

## [0.1.31] - 2025-03-24
- feature: Commands for each service.
- feature: QuickSwitcher, quick switch between projects inside same service.
- fix: Storage Service now retrieves folders and sub-folders.

## [0.1.30] - 2025-02-10
- fix: SDK path now is not using Homebrew default path, allowing users to have full control.

## [0.1.29] - 2025-02-04
- Initial release
- Google Cloud IAM management features
- Cloud Storage management features
- Support for viewing and managing cloud resources
- Network Service management features
- Compute Service management features
- Error recovery and retry mechanisms features
