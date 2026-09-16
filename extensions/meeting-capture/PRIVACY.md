# Privacy

Meeting Capture records only after the user invokes **Start Meeting Capture**. Audio and transcripts are saved to the user-selected local folder.

- Recorded audio is processed locally by the bundled helper and LAME encoder.
- Transcription uses Apple's on-device Speech framework. If a required Apple language model is missing, macOS downloads that model from Apple once and manages it in shared system storage. Meeting Capture does not upload recordings or transcripts.
- The extension has no analytics, advertising, accounts, remote API, developer-controlled server, or credential storage.
- Meeting Capture does not read existing recordings. It creates new MP3 and TXT files and removes only its own hidden temporary segment files after finalization.

Users are responsible for informing participants and obtaining any consent required by applicable law or policy before recording.
