# Done Bear Changelog

## [AI Task Creation] - 2026-08-16

- Added an AI-powered Create Task command that turns one sentence into a reviewable task
- Added natural-language support for dates, lists, projects, teams, and deadlines with an offline fallback
- Consolidated four low-frequency list commands into Browse Tasks and removed the identifier-only project search
- Fixed task creation for workspaces by sending GraphQL workspace IDs with the correct type

## [GraphQL API Migration] - 2026-03-30

- Migrated workspace, task, project, and team fetches from deprecated REST endpoints to GraphQL API
- Added cursor-based pagination for large datasets
- Added support for recurring task templates
- Updated date handling to use epoch timestamps

## [Update] - 2026-03-26

- Updated extension icon

## [Initial Version] - 2026-03-24

Added task management across workspace views, global task and project search, task and project creation, and a menu bar command for Today.
