# OmniFocus Changelog

## [1.2.1] - 2025-05-13

### Fixed

- Action name with double or single quotes no longer breaks the action creation
- Defer dates and due dates are now properly assigned

## [1.2.0] - 2025-03-14

### Added

- General quality of life improvements, specifically:
  - Two new Preferences options for controlling List Task behavior
  - Ability to group tasks by various categories
  - Ability to perform a Clean Up of completed tasks

## [1.1.0] - 2025-02-26

### Removed

- The list inbox command has been removed in favor of the list tasks command

### Added

- List tasks command that will allow you to list tasks from your perspectives (built-in and custom)
  - Please note that this will open OmniFocus in the background and change the view. That is a limitation of OmniFocus AppleScript

## [1.0.1] - 2025-01-22

### Fixed

- Fail gracefully when no subscription is active

### Documentation

- Update README about requirements

## [Initial Version] - 2025-01-02

### Added

- Quick Add To Inbox command to rapidly add tasks to OmniFocus inbox
- Add A Task command with support for:
  - Project assignment
  - Due dates
  - Defer dates
  - Tags
  - Flagged status
  - Notes
- List The Tasks In Your Inbox command with ability to:
  - View all non-completed, non-dropped inbox tasks
  - Complete tasks
  - Delete tasks
  - Open tasks in OmniFocus
  - View task metadata (tags, due dates, defer dates, flagged status)
