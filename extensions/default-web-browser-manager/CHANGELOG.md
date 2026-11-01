# Default Web Browser Manager Changelog

## [Fix timeout when loading browsers] - 2026-10-31

- Give `swift` 60 seconds instead of 10, since it can be slow when its module cache is cold, and say so if it still times out

## [Add Open Default Browser Command] - 2026-05-11

- Add "Open Default Browser" command to quickly open the current default browser

## [Rename Command] - 2025-12-17

- Rename "Choose" to "Set" so it better aligns with the default "System" setting commands

## [Initial Version] - 2025-12-08

- Initial version with the "Choose Default" command
