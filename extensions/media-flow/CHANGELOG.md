# MediaFlow Changelog

## [Initial Release] - {PR_MERGE_DATE}

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
