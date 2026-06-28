# TTS Reader Changelog

## [Unreleased]

## [2.2.0] - 2026-06-27

**Low-latency gateway streaming playback.**

### Added

- Stop Audio command for immediately ending the current playback
- Gateway streaming playback via PCM/MP3 routes when using a compatible `tts-gateway`
- Cross-command stream cancellation for active gateway playback

### Changed

- Playback now runs through a shared controller so one command can stop audio started by another command
- Playback now prefers `ffplay` when it is available and falls back to macOS `afplay`
- Gateway playback now falls back from PCM streaming to MP3 streaming to buffered speech

## [2.1.0] - 2026-04-01

**Gateway-aware transport and improved feedback.**

### Added

- Auto-detect tts-gateway servers via `/health` probe and route requests to `/v1/speech`
- Show TTS engine name in success toast when available
- Show clipboard fallback notice when no text is selected
- Show warning when ffmpeg is unavailable and speed/format preferences are set
- Added ffmpeg documentation to onboarding screen

### Changed

- Custom endpoint paths (e.g., `http://host/api/tts`) are preserved and used as-is
- Gateway-specific error messages for 422, 502, 503, and 504 status codes

## [2.0.0] - 2026-03-11

**Renamed and rewritten for provider-agnostic TTS.**

### Highlights

- Renamed the extension and repository from Pocket Reader / `raycast-pocket-tts-reader` to TTS Reader / `raycast-tts-reader`
- Works with any TTS server that accepts `POST /tts` with a `text` form field
- Sends the optional voice preference as a `voice` parameter
- Detects output audio format from the server `Content-Type` header
- Simplified configuration from 13 preferences down to 5

### Breaking Changes

- Removed generate mode (CLI) — the extension is now HTTP-only
- Removed Pocket TTS-specific preferences: mode, variant, lsdDecodeSteps, temperature, noiseClamp, eosThreshold, framesAfterEos, device
- Cache directory changed from `~/.cache/raycast-pocket-tts/` to `~/.cache/raycast-tts/`

### Recommended Server

Use [tts-gateway](https://github.com/abpai/tts-gateway) for a multi-provider TTS server:
```bash
uv tool install tts-gateway[kokoro]
tts serve --provider kokoro
```

## [1.0.0] - 2025-03-18

Initial release as Pocket Reader in the `raycast-pocket-tts-reader` repository.

- Text-to-Speech with Kyutai Pocket TTS (serve and generate modes)
- Interactive text editor for reviewing text before speech
- Direct reading mode without confirmation dialogs
- Voice configuration with custom voice URLs
- Speed and format options via ffmpeg
- Audio file management and native macOS playback
