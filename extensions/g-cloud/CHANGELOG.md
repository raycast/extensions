# Google Cloud CLI Changelog

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
