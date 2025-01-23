# Pomodoro Changelog

## [Improvement] - 2025-01-07

- Add support for hiding timer when stopped

## [Chore] - 2025-01-03

- Update preferences organization

## [Update] - 2024-12-12

- Move timer to dropdown menu if it's hidden

## [Enhancement] - 2024-12-11

- Add the weekly and daily statistics to the `View Pomodoro Stats` command

## [Fixes] - 2024-12-08

- Fix short break timer

## [Chore & Fixes] - 2024-12-04

- Fix the issue where the prompt does not pop up when the timer is completed
- Move all `lib` source files to `src/lib` since Raycast dev command cannot watch other file in other places
- Bump all dependencies to the latest

## [Fixes] - 2024-12-02

- Fix command launch sequence
- Regenerate `package-lock.json` file
- Move `crossExtensions` field to upper place
- Mark Confetti feature as deprecated

## [Chore & Fixes] - 2024-11-21

- Bump all dependencies to the latest
- Fix confirm dialog not showing issue
- Fix cross-extension prompt if `Enable Mac Do Not Disturb while Focused` is disabled

## [Enhancement] - 2024-10-31

Offers the option to enable Apple's default Do Not Disturb mode when Pomodoro timer is on "Focus" mode

## [Fixed wording] - 2024-10-21

Fixed wording in the Stats command

## [Bugfix] - 2024-07-27

Fixed issue ([#13417](https://github.com/raycast/extensions/issues/13417)) where quotes are not loaded from quotable.io. Moved to zenquotes.io

## [Enhancement] - 2024-06-07

Add option to restart current interval/timer from one click in the menu bar

## [Enhancement] - 2024-04-23

Add recap page to displays information about your prev pomodoro sessions like (total time, total sessions number, back to back sessions,..)

## [Enhancement] - 2024-02-27

Added support for slack to change status during interval, the two new commands are disabled by default

## [Enhancement] - 2024-02-16

Added option to use a quote on timer completion, and added option to disable the image on timer completion.

## [Enhancement] - 2024-01-29

Added confetti parameter to display confetti after interval completes

## [Enhancement] - 2024-01-26

Added starting of next interval based on previous interval

## [Enhancement] - 2023-12-06

Added an option to display random gifs from giphy (using giphy api key)

## [Enhancement] - 2023-07-13

Changed the progress indicator on Menu Bar from Circle to Pomodoro icon

## [Enhancement] - 2023-07-10

Added option to hide time on Menu Bar

## [Enhancement] - 2023-03-23

Added possibility to play completion sound

## [Enhancement] - 2023-02-20

Added possibility to use 90 minutes sessions

## [Enhancement] - 2023-02-05

Added preference textbox for a markdown image link to render after interval completes

## [Fix] - 2023-01-03

Fixed so menubar icons works with both light and dark background

## [Initial Version] - 2022-12-19
