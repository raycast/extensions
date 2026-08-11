# Universal Inbox extension for Raycast Changelog

## [Unreleased]

## [0.3.0] - 2026-06-09

### Added

- Add support for TickTick, Google Calendar, Google Drive and API (web page) notifications
- Fill notification previews with rich content (metadata sidebar, body and comment/message threads) modeled on the web app
- Show the notification source type (e.g. Linear Issue, GitHub Pull Request) in the preview metadata

### Changed

- Swap notification list shortcuts: `Enter` shows details, `Cmd+Enter` opens in browser

### Fixed

- Fix "could not open app" error when opening Google Calendar notifications

## [0.2.0] - 2024-12-16

### Added

- Add support for Slack reaction notifications
- Add support for Slack message notifications

## [0.1.4] - 2024-03-13

### Added

- Add Linear Project and Team icons
- Add Slack notifications (ie. save for later) support
- Set `Inbox` project as default when creating or planning a task

## [0.1.3] - 2024-02-05

### Added

- Display Linear notification reason
- Display Linear project on notification item
- Add missing action icons

## [0.1.2] - 2024-02-01

### Added

- Add "Plan task" action for notification created from task

### Fixed

- Fix "Complete task" action

## [0.1.1] - 2024-02-01

### Added

- Add filter per notification kind

## [0.1.0] - 2024-01-29

### Added

- Support listing notifications from
  - Github Pull Requests
  - Github Discussions
  - Linear Issues
  - Linear Projects
  - Google Mail
  - Todoist tasks
- Act on notifications
  - Open in Browser
  - Delete notification
  - Unsubscribe from notification
  - Snooze notification
  - Create a task from notification
  - Link notification to an existing task
- Act on tasks in the notification list
  - Complete task
