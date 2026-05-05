# Time Tracking Changelog

## [Summary Dashboard, Full History, Enhanced Export, Long Session Detection] - 2026-04-12

- Add "Time Summary" command with project summaries and daily breakdowns for configurable date ranges (today, past week, past 30 days, custom)
- Remove 50-timer limit in "View Project Timers" so full history is accessible, organized by date sections
- Enhance CSV export with ISO datetime columns (`start_datetime`, `end_datetime`) and decimal `duration_hours`
- Add long session detection to "Start Timer" — prompts when switching timers if the previous one exceeded a configurable threshold (1-8 hours)
- Add "Import Timers" command to restore timer data from a previously exported CSV file
- Add optional text timestamp input (`yyyy-mm-dd hh:mm`) alongside the date picker in the edit form for precise time entry

## [Windows Support] - 2026-02-04

- Add Windows support (ref: [#25071](https://github.com/raycast/extensions/issues/25071))

## [Add Tags] - 2025-12-05

- Add support for tagging timers (ref: [Issue #23323](https://github.com/raycast/extensions/issues/23323))
- More robust error handling in Edit Form

## [Rename Timers + Modernize] - 2025-08-14

- Rename timers using Edit Form (ref: [Issue #20915](https://github.com/raycast/extensions/issues/20915))
- Modernize to use latest Raycast config

## [Editing Timers] - 2025-02-28

Edit stopped timers to correct any issues with the start/end times.

## [Export as CSV] - 2025-01-15

Set an "export directory" in `Preferences` then use the new "Export CSV" `Action` to export a CSV file of all your timers (ref: [Issue #16378](https://github.com/raycast/extensions/issues/16378))

## [Initial Version] - 2024-04-07
