# Say - Text to Speech Changelog

## [Bugfix] - 2025-10-06

- Fix missing await for say function to keep the command process alive
- Say the error message with its error name

## [Enhancement] - 2025-10-06

- Add Stop Say command to stop the current running Say process
- Add config option to allow silent on error
- Bump all dependencies to the latest

## [Enhancement] - 2025-08-22

- Add support for stopping the text-to-speech process
- Bump latest mac-say to handle SIGTERM gracefully
- Bump all dependencies to the latest

## [Bugfix & Maintenance] - 2025-07-07

- Bump mac-say@0.3.2 to fix the possibly duplicate lines in Configure Say command
- Bump all dependencies to the latest

## [Routine Maintenance] - 2025-05-19

- Add icon to the Say action
- Bump all dependencies to the latest

## [Routine Maintenance] - 2025-03-19

- Migrate to `@raycast/api@1.94.0`
- Use ESLint flag config
- Bump all dependencies to the latest

## [Routine Maintenance] - 2025-03-17

- Add FAQs
- Bump all dependencies to the latest

## [Enhancement] - 2025-01-08

- Suppress error message if argument is empty
- Add Deeplinks usage to documentation

## [Chore & Fixes] - 2024-11-21

- Bump all dependencies to the latest
- Fix argument types for spawn

## [Chore] - 2024-10-28

- Bump all dependencies to the latest

## [Chore] - 2024-10-02

- Rename extension title
- Bump all dependencies to the latest

## [Bugfix] - 2024-06-23

- Fix unexpected strings start with dashes
- Update API documentation

## [Chore] - 2024-06-09

- Kill existing `say` process before running
- Expose `sayOptions` API
- Bump [mac-say](https://github.com/LitoMore/mac-say) dependency to latest

## [Accessibility Enhancement] - 2024-06-07

- Add support for saying the selected text on any application
- Add Siri Voice tips for best experience

## [Features] - 2024-05-17

- Read system settings from the plist
- Add voice rate support
- Add output device support
- Add screenshot of Configure Say command

## [Fixes] - 2024-05-16

- Fix voice picker

## [Initial Version] - 2024-05-11

- Add Type to Say feature
- Add Text to Say feature
