# MiniMax TTS Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Quick Read: select text and read aloud with one command (toggle to stop)
- Clipboard fallback when selected text is unavailable
- Resume Last Reading and Restart Last Reading commands
- Chunk-level reading progress for medium-length text
- Voice Selection: browse MiniMax system, cloned, and generated voices
- Select Quick Read Voice: choose and preview the voice used by Quick Read
- Set any listed voice as the Quick Read voice
- Stop Reading: dedicated command to stop playback
- Smart text chunking for medium-length text (around 1,400 characters per non-streaming chunk)
- Support for MiniMax Speech 2.8, 2.6, and 02 model versions
- China and Global MiniMax API regions
- Adjustable speech rate (0.5x to 2.0x)
- Cross-command playback control via PID file
