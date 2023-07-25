# PromptLab Changelog

## [Bug Fixes, Custom Action Keybindings] - 2023-07-24

- Added ability to modify action keybindings in the advanced settings
- Added Dialog Window command response view
- Fixed bug where list and grid output views would fail to display any content due to condensing of symbols
- Fixed bug where command-specific temperature settings would not be applied
- Fixed bug where old-style URL placeholders using HTTP instead of HTTPS would not be processed.

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
