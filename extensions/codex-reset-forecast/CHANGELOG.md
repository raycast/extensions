# Codex Reset Forecast Changelog

## [New Forecast Source] - 2026-10-18

- Switch forecasts and reset history to the documented codex-reset.com public APIs.
- Show model confidence and the latest official watch or provider-observed reset notice.
- Follow the website's Reset, Note, and Banked categories and banked statuses.
- Show reset and banked updates separately in the calendar using the source's UTC dates.
- Add visible data-source credit, one-minute refresh limits, and rate-limit handling.
- Use a fresh source-specific cache to exclude data from the retired provider.
- Wait for shared data when commands overlap during the first load.
- Simplify the menu bar to probabilities, the last global reset, and recent reset records.

## [Initial Version] - 2026-09-11

- View the 24-hour and 48-hour Codex reset likelihood and explanation from codexreset.org.
- Browse searchable reset records, original sources, announcements, compensation, and banked resets.
- See recent reset frequency in a two-month calendar, with the current month selected by default.
- Show either forecast horizon or time since the last confirmed reset in the menu bar, with display settings and a Hide action.
- Refresh on demand or approximately every 30 minutes through Raycast's background refresh.
- Keep the last valid snapshot available offline and distinguish request failures from source forecast status.
