# BetterTouchTool Changelog

## [Expanded BetterTouchTool integration] - 2026-09-02

- Replace AppleScript and JXA calls with the official typed BetterTouchTool JavaScript client
- Prefer the local Unix socket with a configurable webserver fallback
- Run background triggers asynchronously
- Run selected triggers by UUID and add reveal, enable, and disable actions
- Replace the static action list with BTT's generated action catalog and parameter forms
- Generate typed forms for named triggers that declare text, number, or selectable input variables
- Add a separate command for browsing, running, revealing, enabling, and disabling all configured BTT triggers
- Add a command for searching, copying, and pasting recent BTT Clipboard Manager items
- Add optional named-trigger result handling
- Add category filtering to the BTT action search
- Restore action-specific icons and infer fallbacks from dynamically loaded action names and categories
- Allow actions, named triggers, and variables to be pinned to the top with Command-Shift-P
- Add actions for creating, editing, clearing, and refreshing persistent variables
- Add searchable variables and development-only connection diagnostics
- Remove trigger URLs that embedded the BTT shared secret

## [Raycast AI support] - 2025-03-07

- Add AI tools for finding and running named triggers and built-in actions
- Add AI tools for reading and changing temporary or persistent variables
- Confirm trigger, action, and variable side effects before execution
- Validate exact trigger UUIDs, catalog action IDs, action parameters, and numeric values
- Add unit tests and Raycast AI evals for common read, search, and mutation flows

## Error handling - 2024-04-28

- Update dependencies and use `runAppleScript` function from utils
- Check for BTT to be active before accessing scripting interface
- Option to run triggers after closing Raycast window

## [Shared Secrets] - 2023-05-10

- Add support for shared secrets in BTT
- Handle error when scripting is disabled in BTT
- Format action names with spaces and add matching icons
- Update to latest Raycast api (v1.50.0)

## [Feedback] - 2023-02-24

- Add icons to Action Panel Items
- Make named trigger filter Dropdown more intuitive

## [Initial Version] - 2023-02-16

- Add action and named trigger search commands
