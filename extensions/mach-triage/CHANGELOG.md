# Changelog

## [1.0.0] - 2026-06-16

### Added

- **Search Tickets** — full-text search (FTS5) across all synced tickets with workspace filtering
- **Today Board** — Active / Stuck / Next / Done lanes reflecting your Mach Triage Today board
- **Mach Triage Status** — health check confirming bridge is running and authenticated
- **View Issue Detail** — full ticket detail with description and comments rendered from ADF to Markdown
- **Change Status** — transition tickets between statuses directly from Raycast
- **Add Comment** — post comments with optional sync to provider (Jira/Linear/GitHub)
- **Log Work** — record time against tickets with provider-aware gating
- **Open in Mach Triage** — deep link to focus the desktop app on a specific ticket
- **Workspace Picker** — filter all commands by workspace, defaults to active workspace
- Pro enforcement on bridge — requires active Mach Triage Pro subscription
- Initial extension scaffold with Mach Triage Status command
- Localhost bridge client (`/health`) with Bearer auth
- Preferences for bridge URL and token
