# Timers Changelog

## [Menu bar improvements, reset stopwatches, end time for timers] - 2023-06-08

- Add menu bar support for stopwatches
- Add ability to hide menubar icon and timer/stopwatch title
- Add reset functionality to Manage Stopwatches
- Add end time for timers in Manage Timers (thanks to @benqqqq)
- Show currently selected alert sound in custom sound selection for Preview Alert Sounds and Start Custom Timer commands
- Fix bug where the 60-minute preset crashed when Start 60 Minute Timer command was run
- Sort preferences for more natural grouping
- Update to new Raycast APIs

## [Enhancement] - 2023-06-07

- Added option to hide menubar icon when no timers are running

## [Add volume cap error for alert sound] - 2023-03-19

## [Enhancement] - 2023-03-15

- Implementation of alert sound choice dropdown when creating/starting custom timer

## [Alert sound volume customization and pausable stopwatches] - 2023-03-10

- Fix bug where timer completion notification would not send until after timer was dismissed when "Ring Continuously" setting was turned on
- Add volume customization for the timer alert sound
- Add ability to pause stopwatches

## [Added missing 2 minute timer in README] - 2023-01-02

## [Minor fixes, alert sound preview command] - 2022-12-21

- Added a 2 minute preset
- Show timer name in alert notification
- Add command to preview alert sound effects

## [Enhancement] - 2022-12-10

- Added custom timer option to menubar

## [Faster menubar] - 2022-11-01

- Now updating every ten seconds instead of every minute.

## [Support new Raycast features and add Stopwatch support] - 2022-09-19

- Added MenuBarExtra support (thanks to @marcjulianschwarz)
- Show name + approximate time of timer nearest to completion in MenuBarExtra
- Added inline argument support for the Start Custom Timer command
- Improve form validation in Start Custom Timer command
- Add stopwatch support (Start Stopwatch and Manage Stopwatches commands)
- Add persistent timer support (alert for finished timer rings until dismissed)
- Refactored state management out to a custom `useTimers` hook
- Refactored out date and time formatter functions to `formatUtils`

## [Fixes] - 2022-08-16

- Fixed an issue whereby timers incorrectly count down below zero - visible when viewing 'Currently Running' timers as they timeout.

## [Added new preferences] - 2022-05-27

- Added a preference for ordering the input fields in the New Timer form — you can now order the fields as `Seconds|Minutes|Hours`

## [Added Timers] - 2022-05-21

- Initial version of the Timers extension!
