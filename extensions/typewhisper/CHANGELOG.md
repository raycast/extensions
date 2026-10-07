# TypeWhisper Changelog

## [Workflows, Recorder, Dictionary, Models, and API Token] - {PR_MERGE_DATE}

- Add Dictate with Workflow to start a dictation that uses a specific workflow
- Rename Switch Profile to Manage Workflows, since TypeWhisper profiles are now workflows, and start a dictation with the selected workflow from there
- Add Toggle Recording and Show Last Recording to record meetings and copy the transcript or open the recording
- Add Add Dictionary Term for the selected text or a typed word, and Manage Dictionary to browse, add, edit, and delete terms and corrections; deleting asks for confirmation
- Add Switch Model to choose the transcription engine and model
- Send the TypeWhisper API token with every request, read from the `api-discovery.json` file that TypeWhisper writes while its API server runs
- Keep working with TypeWhisper versions that do not require a token
- Read the discovery files on Windows from `%LOCALAPPDATA%`, including the current `TypeWhisper-WinUI` folders
- Use the newest discovery file, so files left behind by an app that did not quit cleanly no longer point the extension at a dead port
- Stop a running dictation from Dictate with Workflow and Manage Workflows, and a running recording from Show Last Recording
- Find TypeWhisper from the Mac App Store, which keeps its files in its sandbox container
- Find TypeWhisper and TypeWhisper Beta from the Microsoft Store, whose files Windows keeps in the package folder
- Explain on Windows that a recording could not be stopped because none is running or the last one is still being saved
- Wait for TypeWhisper to load the model when starting a dictation instead of giving up after 10 seconds
- Move Copy Raw Text in Search History to ⌘⌥C (Ctrl+Alt+C on Windows), so the standard copy shortcut no longer copies the unprocessed text

## [Finder Selection for File Transcription] - 2026-06-28

- Prefill Transcribe File with the selected Finder audio file when available
- Keep the file picker as a fallback when Finder has no supported audio file selected

## [Improved Dictation Session Tracking] - 2026-04-24

- Updated Start Dictation and Show Last Transcription to use dictation session IDs for exact transcript lookup
- Prefer session-specific transcript polling over guessing the latest history entry
- Keep the existing history lookup as a fallback when no tracked session is available

## [Initial Version] - 2026-03-06

- Added Start Dictation command to toggle voice dictation
- Added Search History command to browse and search transcriptions
- Added Show Last Transcription command to quickly copy recent text
- Added Switch Profile command to manage TypeWhisper profiles
- Added Transcribe File command for audio file transcription
- Auto-discovery of TypeWhisper API port
