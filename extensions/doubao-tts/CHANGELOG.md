# Doubao TTS Changelog

## [Update] - {PR_MERGE_DATE}

- Add Select Quick Read Voice for choosing and previewing the default Quick Read voice
- Add action to set any listed voice as the Quick Read voice
- Support new Volcengine X-Api-Key authentication with legacy App ID/Access Key fallback
- Stream V3 HTTP responses incrementally and pre-synthesize the next text chunk during playback
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
