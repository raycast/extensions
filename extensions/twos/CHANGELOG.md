# Twos Changelog

## [Photo results and opening in the desktop app] - 2026-08-16

- **Search Things** now finds things by the text inside their photos. A
  receipt, whiteboard, or screenshot is searchable by what it says.
- Photo results are labelled with the text read out of the image (or "Photo"
  when the picture has no readable text) instead of showing as "(empty)", and
  carry an image icon. **Copy Text** copies what the row displays.
- **Search Things** now opens results in the NewTwos desktop app when it's
  installed, instead of always going to the browser. Opening a thing lands on
  its list scrolled to that row, and the browser stays available on `⌘↵`.
- New **Open Results In** preference: Automatic (the new default — desktop app
  if installed, browser otherwise), NewTwos Desktop App, or Browser.
- Opening a thing in the browser now scrolls to it as well, rather than landing
  at the top of its list.

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
