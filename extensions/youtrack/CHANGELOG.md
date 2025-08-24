# YouTrack Changelog

## [Update] - 2025-08-08

- Bugfixes and improvements

## [Update] - 2025-06-23

- Move screenshots to `metadata`

## [Update] - 2025-06-23

- Switch to [udamir/youtrack-client](https://github.com/udamir/youtrack-client) with global refactoring
- Improve `browse` command:
  - Add `apply command` command to apply [YouTrack command](https://www.jetbrains.com/help/youtrack/cloud/commands.html) to a selected issue
  - Add `show last comment` command to show the latest command
  - Add `delete issue` command
  - Support images in inline text both for issues and comments
  - Adjust list view
  - Adjust issue details view
- Add AI tools: `apply-command`, `create-issue`, `get-comments`, `get-issues`, `get-projects`, `get-self`, `get-users`

## [Update dependencies] - 2025-02-12

## [Update] - 2025-01-07

- Update YouTrack icon

## [Update] - 2024-07-08

- Add Assignee to Issue Details page

## [Update] - 2024-05-14

- Fix missing `workItemType` for new work items ('Add Work'-feature)

## [Update] - 2024-04-12

- Utilize `List.Item`'s `keywords` for filtering by issue ID

## [Update] - 2024-01-24

- Add 'Add Work' action to add work items to the issue

## [Update] - 2024-01-21

- Add 'Create Issue' command
- BREAKING CHANGE: 'Browse Issues' preferences moved from global to per-command scope

## [Bugfixes] - 2023-07-22

- Fix user avatar render issues
- Remove markdown images from issues' bodies until they are supported by the library

## [Small Update] - 2023-07-16

- Add basic issue details on `Alt(Opt) + Enter`

## [Initial Version] - 2022-07-27

- Initial version code. Support basic issues browsing.
- Icons indicate if an issue is `Resolved` or `Open`.
