# PromptLab Changelog

## [Maintenance] - 2025-06-18

- Use the npm official registry
- Bump all dependencies to the latest

## [PromptLab 1.2.3] - 2024-01-16

- Added option to record previous runs of a command.
- Added {{lastRun}} placeholder.
- Fixed bug where commands that don't show a response view would hang if the prompt evaluated to an empty string.

## [PromptLab 1.2.2] - 2024-01-09

- Code cleanup. No user-facing changes.

## [PromptLab 1.2.1] - 2023-12-31

- Added transparency to the menu bar icon.
- Updated default Raycast AI model to GPT-3.5 Turbo Instruct.
- Updated dependencies, now using placeholders-toolkit package.

## [PromptLab 1.2.0] - 2023-08-15

- Added support for several new browsers
- Added support for models that don't use the "data: ..." format (e.g. on-device Ollama models)
- Added placeholders for getting HTML/text content of elements in the active browser tab, i.e.: `{{elementText:...}}`, `{{elementHTML:...}}`, and `{{focusedElement}}`
- Added `{{currentAppBundleID}}` placeholder
- Added `{{screenContent}}` and `{{windowContent}}` placeholders
- Added support for `target` parameter to `{{js:...}}` placeholders
- Added horizon detection support for images, as well as `{{imageHorizon}}` placeholder
- Fixed per-command model setting not saving
- Fixed YouTube transcript placeholders not working
- Fixed 'No such file' error when running a command that reads metadata when Finder is inactive

## [Bug Fixes, Custom Action Keybindings] - 2023-07-24

- Added ability to modify action keybindings in the advanced settings
- Added Dialog Window command response view
- Fixed bug where list and grid output views would fail to display any content due to condensing of symbols
- Fixed bug where command-specific temperature settings would not be applied
- Fixed bug where old-style URL placeholders using HTTP instead of HTTPS would not be processed correctly

## [PromptLab 1.1.0] - 2023-07-16

- Added "PromptLab Menu Item" command for easy access to commands
- Added "Manage Models" command for straightforward switching between multiple models
- Added per-command model setting
- Added command settings for voice input and spoken responses
- Added support for multiple chats + chat history
- Added ability set favorite commands, models, and chats
- Added ability to set default model
- Added chat statistics
- Added chat context data
- Added command IDs
- Added custom configuration fields when creating commands + view to set their value upon first run of the command
- Added configuration placeholders
- Added video feature extraction by analyzing frames
- Added placeholder hints
- Added many new placeholders
- Added support for custom placeholders and custom placeholder files
- Added flow control directives
- Added persistent variable directives
- Shell placeholders now run in the user's environment unless explicitly disabled

## [Bug Fixes] - 2023-06-22

- Fixed bug where various commands incorrectly accessed the list of installed commands, causing an error
- Fixed placeholders for events and reminders not working on macOS Sonoma

## [Initial Version] - 2023-04-18
