# RSVP Mode Changelog

## [Initial release] - {PR_MERGE_DATE}

Built on a fork of [Reader Mode](https://www.raycast.com/chrismessina/reader-mode) (article extraction) with TTS patterns from [Say](https://www.raycast.com/litomore/say) and RSVP timing from [speed-reader](https://github.com/aaronpowell/speed-reader).

### Added

- Three commands: **RSVP a URL**, **RSVP Clipboard URL**, **RSVP Current Browser Tab**.
- Pre-rendered audio synthesis with parallel chunk generation via macOS `say -o`.
- Sentence-level visual/audio sync derived from `afinfo` per-chunk durations — zero drift.
- Smart chunking: merges sentences under 20 words, splits sentences over 300 at commas/parens.
- Classic centered RSVP display with ▼/▲ ORP markers; words slide under fixed-position arrows.
- Image-only paragraphs render inline with a 2.5-second pause.
- AppleScript fallback for browsers when the Raycast browser extension is unavailable.
- Orphan temp-directory sweep on first synthesis per session.
- Keyboard controls for play/pause, sentence nav, speed adjustment, TTS toggle.
