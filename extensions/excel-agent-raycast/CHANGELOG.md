# Changelog

## [1.0.0] - 2026-01-29

### Added
- **AI Chat Integration**: Use `@Excel Agent` in Raycast Chat to manipulate spreadsheets with full context.
- **Batch Execution**: The AI now groups instructions into single transactions for 3-4x faster execution.
- **Test Connection**: Dedicated feature to verify Excel connectivity and Accessibility permissions.
- **Built-in Scripts**: Reliability layer that uses pre-built AppleScript for common tasks (Bold, Financial Style, Borders) bypassing AI generation errors.
- **Context Awareness**: The agent now reads "Sheet Name" and "Selection" before complying with requests.

### Improved
- **Speed**: Reduced context gathering latency by 80% (removed scanning entire used range by default).
- **Reliability**: Rewrote AppleScript execution to using strict `tell active sheet` scoping to prevent silent failures.
- **Error Handling**: Clearer error messages when Excel is not running or permissions are missing.
- **UI**: Streamlined "Ask Excel" command interface with Quick Actions and History.

### Fixed
- Fixed an issue where AppleScript would run successfully but not apply changes to the active workbook.
- Fixed timeouts on slower machines by optimizing script generation.
