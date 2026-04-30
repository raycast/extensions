# E-Connect Raycast Control Changelog

## [Initial Version]

- Added `Dashboard`, `Devices`, `Automations`, and `Open Web UI` commands for self-hosted E-Connect instances.
- Added direct API-key-based connectivity for local E-Connect servers, including HTTP and optional HTTPS support.
- Added safe background polling on the `Devices` command so online/offline state and last-seen timestamps refresh while the list stays open.
