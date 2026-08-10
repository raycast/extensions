# Twos Changelog

## [Rebuilt on the Twos public API] - 2026-07-16

- Rewrote the extension against Twos's documented public API at
  `writethingsdown.com/api/v1/*`, authenticated with an API key from
  Settings → Advanced → API Keys (replaces the legacy user_id + token
  pair that pointed at the older `twosapp.com` backend).
- Renamed the extension from "Twos Post" to "Twos".
- **Add Thing** — post a to-do, note, or hyperlink to a list. Adds
  hyperlink support and switches the list picker to a searchable
  dropdown backed by the API.
- **Search Things** — new command. Search across all your lists and
  things; open, complete, copy, or open their hyperlink.
- **Create List** — new command. Create a new list with optional
  emoji, straight from Raycast.
- New icon, updated store metadata, and screenshots for the new commands.

## [Maintenance] - 2025-11-20

- Add support for Windows platform.
- Bump all dependencies to the latest.

## [Added Twos Post] - 2023-10-28

Initial version code
