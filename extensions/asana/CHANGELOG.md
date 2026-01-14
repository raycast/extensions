# Asana Changelog

## [Add support for Asana sections] - 2025-10-28

- Added option for assigning a section when creating a task. User can select from a list of existing sections.
- Added action on tasks returned from My Tasks allowing user to move a task to another section
- Added option for assigning tags when creating a task. User can select from a list of existing tags.
- Added ability to filter My Tasks by section and tag
- Section and tags are now displayed in the task detail view

## [Auto-close window after task creation & configuration modernization] - 2025-04-16

- Introduced a preference to automatically close the Raycast window and show a HUD notification after creating a task, streamlining the workflow.
- Modernized the extension by adopting the latest configuration standards for improved maintainability and compatibility.

## [Add option to hide the "Start Date" field] - 2025-02-12

- Add a preference to allow the user to hide the `Start Date` field in the `Create Task` command

## [Add "Copy Task Formatted URL" action] - 2024-03-27

- Added a new task command - "Copy Task Formatted URL"

## [Add option to add or remove task projects and change due date] - 2024-03-01

- Added the ability to add or remove projects from tasks
- Added the ability to change the due date of tasks
- Fix empty state flickering when loading tasks

## [Use OAuth utils] - 2024-02-01

- Use new OAuth utils

## [Remove Raycast signature] - 2023-04-19

- Remove Raycast signature preference from the `Create Task` command

## [Fix a bug] - 2022-11-24

Fixed an issue where the Asana extension would timeout when querying for projects in workspaces with a lot of projects.

## [Open Source the Extension] - 2022-09-28

## [Added Extension to Store] - 2021-11-30

Asana added to the Raycast Store.
