# MediaFlow Changelog

## [Fix Now Playing menu bar crash] - 2026-08-24

- Fix a `renderEmpty timed out after 5000ms` crash in the Now Playing menu-bar command when nothing was playing and "Show when stopped" was disabled. The live-refresh stream no longer keeps the command running on the empty state, so the menu-bar item updates reliably.

## [Initial Release] - 2026-08-03

- Now Playing menu bar: artwork, title/artist, live position, play/pause/skip, and
  quick volume/output-device switching without leaving the menu bar.
- Media Details view: rich list with large artwork, full metadata, and every active
  media source at once.
- Audio Devices view: list and switch input/output devices, wireless badge, transport
  type, per-device volume where supported.
- Universal source detection via the `media-control` CLI, with AppleScript enrichment
  and control for Music.app and Spotify, and graceful degradation to AppleScript-only
  coverage when `media-control` isn't installed.
- Playing-first sorting keeps the active source at the top of the menu.
- AI tools: Get Now Playing and Control Playback, usable from Raycast AI / Quick AI.
