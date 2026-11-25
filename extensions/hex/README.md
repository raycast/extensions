# Hex

Control [Hex](https://github.com/anomalyco/hex), the local dictation app, from Raycast (macOS).

## Commands

| Command | What it does |
| --- | --- |
| Toggle Dictation | Starts a dictation, or stops it and pastes the transcript. Opens Hex if it isn't running |
| Start / Stop / Cancel Dictation | Starts a dictation (opening Hex if it isn't running), stops it and pastes the transcript, or discards it |
| Paste Last Dictation | Pastes your last dictation into the active app |
| Copy Last Dictation | Copies your last dictation to the clipboard |
| Search Dictation History | Search what Hex has kept, filter by app, then paste or copy |
| Browse Captures | Screenshots, screen recordings, and annotations, with paste, copy, and Quick Look |
| Take Screenshot | Opens Hex's picker to copy and save a screenshot |
| Toggle Annotation | Starts or stops an annotation (screen recording with drawing and narration) |
| Toggle Sending Annotations to OpenCode | Turns sending annotations to OpenCode on or off. When off, Hex only saves and copies annotations and stops warning that OpenCode isn't running |
| Search Meetings | Recorded meetings and their transcripts |
| Toggle Meeting Recording | Starts recording a meeting, or stops and transcribes it |
| Manage Vocabulary | Adds, edits, and removes vocabulary terms and their "sounds like" spellings |
| Add Vocabulary Term | Adds a term from Raycast search. Press Tab to add optional "sounds like" spellings |
| Switch Model | Picks the transcription model, or downloads another |

Give the dictation commands a hotkey in Raycast to drive Hex from the keyboard.

## Requirements

- Hex 3.4.0 or later (tested with 3.4.0). The extension uses the `hex` command-line tool inside Hex.app, so nothing else needs installing.
- Hex must be running for everything except Search Dictation History and Copy Last Dictation, which read history from disk, and Start and Toggle Dictation, which open Hex.
- Some commands need a Hex feature turned on: Take Screenshot needs **Labs › Screenshots**, Toggle Annotation needs **Settings › Annotate**, and the meeting commands need **Labs › Meetings (beta)**.

## Privacy

The extension reads Hex's data on your Mac and controls the Hex app. It sends nothing over the network itself. Hex downloads models, and sends annotations to OpenCode only while sending is on.
