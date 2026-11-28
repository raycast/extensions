# OmniFocus Changelog

## [Fix special characters, nested tags and error handling] - {PR_MERGE_DATE}

### Fixed

- Task names, notes, tags, project names and perspective names containing backticks, `${...}` or backslashes no longer break commands
- Choosing a nested tag in Add a Task now assigns that tag instead of creating a duplicate at the top level (#21696)
- Add a Task no longer creates a duplicate task when a tag or project can't be assigned; the form closes and says what's missing
- Tags typed in "Tags to create" are no longer added twice on retry, and empty entries (such as a trailing comma) are ignored
- Projects with the same name in different folders are now assigned correctly
- Add a Task no longer shows a blank screen when tags or projects fail to load
- Add a Task and List Tasks now explain when OmniFocus isn't installed or Pro isn't active, instead of showing a generic error
- The "Automation in OmniFocus Pro" button now opens the OmniFocus page
- Quick Add to Inbox now reports errors (including OmniFocus not being installed) in a toast that keeps Raycast open, and confirms success with a HUD

## [Planned Date support] - 2026-09-14

### Added

- Planned Date field in the Add a Task form (requires OmniFocus 4.7 or later)
- Planned dates shown in task lists and task details

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
