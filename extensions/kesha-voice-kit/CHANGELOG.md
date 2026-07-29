# Kesha Voice Kit Changelog

## [Setup guidance and faster failure feedback] - 2026-07-27

- Rewrite the "kesha CLI not found" message as numbered setup steps, leading with Homebrew so the guidance works without knowing about bun, and include the required `kesha install` step.
- Add actions to the error view: copy the error text, open extension preferences, or open the setup guide.
- Check the CLI and engine before recording starts, so an unfinished setup shows the exact remaining command instead of a recording that cannot produce a transcript.
- Warn within ~8 s when the microphone delivers no signal, pointing at the macOS Microphone permission, instead of leaving the session silent until it times out.
- Stop recording after the silence auto-stop even when the level meter never starts, so a session with a dead meter no longer runs to the full duration.

## [Initial Version] - 2026-07-24

- Add **Dictate to Clipboard** command: records from the default microphone, transcribes locally with Kesha Voice Kit, and copies the transcript to the clipboard.
- Auto-detect the `kesha` binary across common global install locations so Raycast's GUI environment does not require manual PATH setup.
- Add a max recording duration preference to prevent runaway microphone sessions.
