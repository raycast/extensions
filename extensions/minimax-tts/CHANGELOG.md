# MiniMax TTS Changelog

## [Initial Version] - {PR_MERGE_DATE}

### Reading
- Quick Read: select text and read aloud with one command (toggle to stop)
- Clipboard fallback when selected text is unavailable
- Resume Last Reading and Restart Last Reading commands (always restart/resume; no surprise toggle)
- Chunk-level reading progress for medium-length text
- Smart text chunking for medium-length text (around 1,400 characters per non-streaming chunk)
- Cross-command playback control via PID file; external stop is treated gracefully
- Speed up Reading and Slow Down Reading commands adjust active or paused readings by 0.25× for the next synthesized segment
- Persistent reading-status menu-bar item showing live `Synth N/M` / `Play N/M` / paused state with Stop / Resume / Restart / Speed Up / Slow Down / Read / Pick Voice controls

### Voices
- Read with Voice Selection: browse MiniMax system, cloned, generated, and configured custom voice IDs
- Per-row "Synthesizing N/M" / "Playing N/M" progress while the picker stays browsable
- Select Quick Read Voice: choose and preview the voice used by Quick Read
- Active Configuration row surfaces the resolved auth mode + model + region with conflict warnings
- Set any listed voice as the Quick Read voice
- Paper-reading defaults include Mandarin and English MiniMax voices such as `Chinese (Mandarin)_Radio_Host`, `Chinese (Mandarin)_Sincere_Adult`, `Chinese (Mandarin)_Gentleman`, `hunyin_6`, `Chinese (Mandarin)_Wise_Women`, `Chinese_sweet_girl_vv1`, `English_CalmWoman`, `English_captivating_female1`, `English_AttractiveGirl`, and `English_nursery_teacher_vv2`
- Voice list cached locally for instant warm-start; refreshes in the background
- Voice preview and ad-hoc reading both survive view dismissal
- Default Custom Voice ID and Extra Custom Voice IDs appear at the top of every voice picker, tagged `Default` and `Unverified` until MiniMax voice lookup confirms them
- Clone Voice: upload source audio, optional prompt audio + prompt text, create a cloned voice, and preview the returned demo audio
- Inline form validation for Voice ID, audio, prompt text, and preview text
- Uploaded clone-source files are cached for 24h, so retries skip the re-upload step

### Models and Auth
- Support for MiniMax Speech 2.8, 2.6, and 02 model versions
- Token Plan Key and Open Platform API Key authentication modes (auto-detected by default)
- China and Global MiniMax API regions
- Adjustable speech rate (0.5× to 2.0×)
- Configuration and model-mismatch errors offer Open Preferences as a primary action

### Commands
- Stop Reading: dedicated command; surfaces "Resume Last Reading" when nothing is active but a paused session exists
- Speed up Reading: increase the current reading speed by 0.25×, up to 2.0×
- Slow Down Reading: decrease the current reading speed by 0.25×, down to 0.5×
