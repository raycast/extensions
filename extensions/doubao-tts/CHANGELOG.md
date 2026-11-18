# Doubao TTS Changelog

## [Update] - 2026-04-23

- Add Select Quick Read Voice for choosing and previewing the default Quick Read voice
- Keep Quick Read voice selection in the dedicated Select Quick Read Voice command
- Sync the TTS 2.0 voice selector with the official Volcengine Doubao voice catalog
- Add Volcengine X-Api-Key authentication without breaking existing App ID and Access Key setups
- Switch synthesis transport to the V3 bidirectional WebSocket streaming API
- Add a unique X-Api-Connect-Id header for each WebSocket connection
- Cancel lookahead synthesis when playback is stopped
- Increase the default text chunk size for fewer WebSocket sessions on medium-length articles
- Refresh the extension icon with light and dark theme variants

## [Initial Version] - 2026-03-05

- Quick Read: select text and read aloud with one command (toggle to stop)
- Voice Selection: browse 90+ voices organized by category
- Stop Reading: dedicated command to stop playback
- Smart text chunking for long text (≤1024 UTF-8 bytes per chunk)
- Support for TTS 2.0 and TTS 1.0 model versions
- Voice-model compatibility validation
- Adjustable speech rate (0.5x to 2.0x)
- Cross-command playback control via PID file
