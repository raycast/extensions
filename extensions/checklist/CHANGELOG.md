# Checklist Changelog

## [🦧 Small improvements] - 2024-05-28

- Preserve `isCompleted` state for tasks when editing a checklist.

## [🪲 Fix issues] - 2024-02-05

- Fixed a bug where the app would log an error when trying to import a checklist from clipboard.
- Fixed a bug where editing a checklist would create a new checklist instead of updating the existing one.
- Fixed a bug where it was possible to create a checklist without any tasks.
- Overall cleanup and refactoring.

## [🪿 Renaming and new keyboard shortcuts] - 2023-09-20

- Quest is now called Checklist.
- Renamed actions to match new name.
- Using new keyboard shortcuts from `Keyboard.Shortcut.Common`.

## [🤲🏻 Import & Export Quests] - 2023-03-18

- Add export (share quest)
- Add import (paste from clipboard during quest creation)
- Add link to quest ideas
- Add a task filter to quest view

## [🐣 Hello World] - 2023-03-12

- Add action to create quests
- Add action to edit quests
- Add action to delete quests
- Add action to start quests
- Add action to stop quests
- Add export as markdown
- Add export as JIRA markdown
