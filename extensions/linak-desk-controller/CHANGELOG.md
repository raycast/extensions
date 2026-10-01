# Linak Controller Changelog

## [Fixes] - {PR_MERGE_DATE}

- Fixes "Couldn't find your desk" when the Desk identifier preference from an older version no longer matches your desk. If exactly one desk is nearby, it's used and remembered
- Select Desk now works even when the Desk identifier preference is set
- Fixes the first move after the desk has been idle for a while, which could do nothing or report an obstruction

## [Built-in Bluetooth] - 2026-09-30

- Talks to the desk directly over Bluetooth, so linak-controller, Python and server mode are no longer needed
- Finds your desk automatically, with a new Select Desk command for picking one
- Adds Raise Desk, Lower Desk and Stop Desk commands
- Shows the current desk height in the menu bar

## [✨ AI Enhancements] - 2025-02-21

## [Server Mode] - 2024-05-11

Adds server mode

## [Initial Version] - 2024-03-08
