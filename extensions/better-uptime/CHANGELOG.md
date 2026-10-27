# Better Stack Changelog

## [Rebrand to Better Stack] - 2026-10-27

- Rename the extension from Better Uptime to Better Stack and use Better Stack's icon
- Keep the commands showing up when searching for "Better Uptime"
- Switch to Better Stack's API domain
- Update the API token instructions to point to Better Stack's team-based Incidents API tokens

## [Windows support and fixes] - 2026-10-25

- Add Windows support
- Update to Raycast API 2
- Fix Add Monitor never submitting, and offer the check frequencies and ping timeouts the API accepts
- Show form errors inline in Add Monitor, Add Incident and Add Heartbeat
- Ask for confirmation before deleting monitors, incidents and heartbeats, and add a shortcut for deleting
- Stop Delete Incident being the default action for incidents without a URL
- Make Copy Heartbeat URL the default heartbeat action, and remove Open Heartbeat URL in Browser since opening the URL sends a heartbeat
- Show the API's error message when a request fails, and stop crashing on network errors
- Stop sending monitor credentials (basic auth, request headers and body, proxy host, and Playwright scripts and variables) to Raycast AI

## [Extension overhaul] - 2026-01-27

- Add grouping support for monitors, heartbeats, and incidents with group names from API
- Add pagination for incidents with separate unresolved/resolved sections
- Improve incidents by adding color-coded status icons and details (timeline, duration, regions, resources)
- Improve monitors by adding regions and HTTP method
- Replace emojis with native Raycast icons and colors
- Improve metadata organization and readability across all list commands
- Update screenshots to reflect changes

## [Update] - 2025-02-21

- Add AI features

## [Update] - 2025-01-29

- Update the Raycast API and general small improvements

## [Update] - 2022-08-15

- Add the ability to create/delete monitors, incidents and heartbeats from within Raycast

## [Added Better Uptime] - 2022-06-17

- Initial version code
