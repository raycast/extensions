# Speedtest Changelog

## [Live Speed Meter] - 2026-09-09

- The command now opens on a live speed meter: download and upload speedometers side by side (the running one animates, the other waits), bandwidth-over-time charts and a ping → download → upload phase strip, all rebuilt from generated SVG on every progress event.
- Once finished, both meters keep their final value together with their sample history.
- All ISP, server, ping, download, upload, quality and result data is shown in the sidebar next to the meter.
- The previous list view is still available via "Show Detailed List" (⌘L), with per-item charts (gauge, sparkline, latency range, summary) above the existing metadata and progress-ring icons while a phase runs. The command remembers which of the two views you used last and opens in it next time.
- Charts follow Raycast's light/dark appearance and use the accent colors of the built-in Raycast themes, so they match the native tags in the sidebar.
- Added "Copy Meter Image", "Paste Meter Image" and "Save Meter Image to Downloads" (macOS): the meter is rendered to a PNG with the system's QuickLook, no extra dependencies, ready to drop into Slack, Notes or a document.
- Fixed the CLI being launched twice per run (duplicate effect run never killed the first process), which doubled the requests counted against Ookla's rate limit. Restart now also clears a previous error.
- Failures keep the original error window and now show the CLI's actual reason (e.g. Ookla's rate limit) instead of a generic message.
- Fixed a crash while a test is running caused by live CLI events that omit latency fields.

## [Fix Progress Parsing] - 2026-05-21

- Fixed Speedtest runs crashing when progress output arrives in combined chunks.

## [Add Keyboard Shortcuts] - 2026-05-16

- Added shortcuts for copying the speedtest summary and selected section data.
- Updated existing restart and clear cache shortcuts to use Raycast common shortcuts.

## [Enhancement] - 2024-11-25

- Update README with FAQs

## [Update] - 2024-06-12

- Updated command title.
- Improved overall appearance.
- Improved UX for the `Clear CLI Cache` action.

## [Update] - 2024-06-11

- Add a detailed view.
- Add an action to copy detailed view data.
- Increase types coverage.
- Refactor code to improve maintainability and scalability.

## [Update] - 2024-05-13

- Update interface to include streaming quality.

## [Optimize] - 2023-08-30

- Catch possible crash in speedtest.
- Upgrade to 1.57.
- Use Raycast Icons instead of custom ones.
- Add Restart Action.

## [Spelling] - 2023-06-13

- Corrected naming convention for an action.

## [Update] - 2023-05-10

- Added the ability to open the result url in the browser by pressing `opt + enter`.
- Updated Raycast API to 1.51.0.

## [Update] - 2022-10-04

- Update speedtest CLI to 1.2.0, which is a universal binary.

## [Update] - 2022-05-03

- Updated Raycast API to 1.33.0.

## [Copy URL] - 2022-02-25

- Added the option to view and copy the result url.

## [Initial Version] - 2021-11-12

- Add Speedtest.
