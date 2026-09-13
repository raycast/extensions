# Spellbook Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Search Commands: fuzzy search over your saved commands, frecency-sorted; Enter runs with defaults, Cmd+Enter opens a prefilled override form with a live final-command preview.
- Save Command: quick capture with `{{param=default}}` placeholders, clipboard prefill, and live parameter detection.
- Inline runs stream output into Raycast; terminal runs hand off to Terminal.app or iTerm2.
- Dangerous commands (rm -rf, sudo, forced push, …) require confirmation showing the exact resolved command.
- Library stored as human-editable JSON at `~/.config/spellbook/commands.json` (dotfile/git syncable).
