# awork Changelog

## [Create and edit tasks] - 2026-08-19

- Added the **Create Task** command for project and private tasks, including status, task list, parent task, assignees, dates, planned effort and priority. Press `⌘⏎` to create a task or `⌘⇧⏎` to create it and open it in the browser. Use `⌃C` in the project or task search to create a task or subtask.
- Added the **Edit Task** action `⌃E` in the task search. The form opens prefilled with all task details and can turn a task into a subtask or back into a standalone task.
- Updated the task-search actions so `Open in Browser` is the default action (`⏎`) and `Copy URL to Clipboard` uses `⌘⏎`.
- **Raycast AI** can now create and edit tasks from a simple description. It resolves the matching project, status, task list, assignees and type of work, and always asks for confirmation showing the affected task before anything is saved in awork. When editing, only the details you mention are changed.

## [Improve stability] - 2026-05-27

- Improve reload logic

## [Improve stability] - 2026-03-25

- Improve error handling of http requests

## [Improve time logging search] - 2026-03-01

- Added search for task key and project key in time logging

## [Project and task keys] - 2026-02-19

- Added search support for project key and task key

## [Raycast AI & Windows support] - 2025-12-17

- Added **Raycast AI** support
  - Use natural language to search awork projects and tasks or log time. Raycast AI understands awork's structure (projects → tasks → status & details) for faster, more intuitive workflows.
- Added **Windows** support

## [Bugfix] - 2025-08-26

- Fix login

## [Improve User Interface] - 2025-08-26

- Added option to show tasks with status done
- Added option to show projects with status closed
- Added indicators for status of tasks and projects

## [Bugfix] - 2025-06-04

- Added error response when authenticating fails

## [Bugfix] - 2025-04-15

- Fix error when searching in projects and tasks

## [Initial Version] - 2025-04-10

We're excited to release the first version of our Raycast extension for awork, the powerful, but intuitive project management software from Germany.
– Hypercode
