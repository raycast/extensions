# Timers Changelog

## [Chore] - 2025-01-14

- Moved contributor to past contributors list

## [Pausable timers, custom timer form bypass] - 2025-01-03

- Timers can now be paused/unpaused!
- Added "Custom Timer Form Bypass" preference, allowing the form in "Start Custom Timer" to be skipped when args are provided (thanks to @a-laughlin for the contribution)

## [Fix commands finishing before timer launch due to alert] - 2024-09-24

## [Fix date formatter and residual timer files] - 2024-09-21

- Fix issue where date formatter incorrectly displayed the previous month instead of the current one
- Fix issue where the "Speak Timer Name" alert sound would result in residual timer files
- Fix issue where the "Speak Timer Name" alert sound would not respect the "Ring Continuously" setting
- Add alert to inform the user about how to stop the alert sound when "Ring Continuously" is enabled

## [Bugfixes and improvements] - 2024-07-13

- Fix bug where alert sound would not play if osascript notification command failed due to lack of permissions
- Fix bug where quicklink-root-presets would not close properly if "Automatically close window on start" was disabled
- Add icons to "Manage Timers" and "Manage Stopwatches" command actions
- Various code improvements

## [Persistent commands, codebase cleanup] - 2024-05-19

- Add preference to keep "Manage Timers" and "Manage Stopwatches" commands open on timer/stopwatch start
- Various refactors around the codebase

## [Fix dismissTimerAlert leaving behind residual timer files] - 2024-02-02

## [Fix sorting and time subtitle in configureMenubarPresets] - 2024-01-23

## [Menu bar quality-of-life upgrades and configurability] - 2024-01-23

- Rename "Show Menu Bar Item When" preference to "Show Menu Bar Icon When" to better reflect what it actually does
- Fix default icon setting for menu bar icons
- Add ability to show menu bar icon when no timer/stopwatch is running, and hide it when one is
- Don't show hours in menu bar title times if the countdown/elapsed time is <1hr
- Add "Configure Presets in Menu Bar" command that lets you choose which custom/default timer presets to show in the Timers Menu Bar

## [Deeplinks, add preset to root search via quicklink, keywords] - 2024-01-15

- Add action to "Manage Timers" command that lets you add presets to root search via deeplinks + quicklinks
- Add deletion confirmation to custom timer presets
- Add keywords to make the extension more discoverable

## [Fix bug where stopping a timer did not stop the alert due to incorrect .dismiss path] - 2023-11-08

- Fix bug where the `.dismiss` file wasn't being deleted when a timer was stopped, leading to a perpetually ringing timer (thanks to @atuooo for the contribution)

## [Fix dismiss command, add "Stop Running Timer" command, screenshot update] - 2023-11-05

- Fix bug where "Dismiss Timer Alert" would crash due to improper filtering of running timers
- Rename "Dismiss Timer Alert" to "Dismiss Ringing Timer" to clarify what the command actually does
- Add "Stop Running Timer" command to easily stop the timer closest to completion
- Update screenshots to reflect newer UI and Raycast versions

## [Stopwatch menu bar improvements, minor UX fixes] - 2023-09-30

- Add ability to delete stopwatches from menu bar
- Fix bug where pausing stopwatch from menu bar didn't work properly
- Fix bug where "Dismiss Timer Alert" would crash when run without "Ring Continuously" preference set
- Un-require settings that should be optional

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
