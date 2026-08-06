# Codex Changelog

## [Modernized Thread Management] - 2026-07-25

- Updated the Codex integration for the ChatGPT desktop app and current app-server behavior.
- Replaced the local transcript index with native transcript search and structured thread reads.
- Improved the thread search, details, fork, rename, summarize, archive, and export workflows.
- Removed the unreliable Compact Thread action.
- Added memory-safe paginated history reads so previews, summaries, copying, and exports work on newer and larger threads without exhausting the extension worker.
- Made manual refresh reload both thread metadata and the selected preview.
- Added a Paste Summary action with a Command-V shortcut.
- Redesigned the new-thread picker as a Working Directory dropdown with an explicit Custom Path option, replacing the text field that silently overrode your choice.
- Sped up the picker: Configured folders show immediately while recent thread counts load from cache and refresh, with clearer loading and error states.
- Fixed new-thread links being dropped when the ChatGPT app was closed; commands now launch the app and wait before sending the prompt and folder.
- Renamed the Default Working Directory preference and added a one-time tip pointing new users to the Working Directory Root setting.
- Reworded start confirmations for clarity (for example, "Initialized new thread with prompt").
- Reorganized the thread action menu into consistent sections with a uniform shortcut scheme, and made Archive a quick non-destructive action.
- Added Copy Last User Turn and Copy Last Assistant Turn actions.
- Polished the folder pickers: native folder selection for Custom Path and real Finder icons in place of colored dots.
- Refined the thread detail preview: User and Codex labels, attachment noise stripped, long messages truncated.
- Copy Resume Command now copies a clean "codex resume <id>" using your installed CLI.
- Refreshed the extension icon.
- Updated to the latest Raycast API for current platform compatibility.

## [Initial Version] - 2026-07-18

- Added commands for starting Codex threads and opening Codex.
- Added thread search, resume, rename, summarize, archive, unarchive, fork, compact, and export workflows.
- Added a recent and project-folder picker to the prompted new-thread command.
