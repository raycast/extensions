# GitLab Changelog

## [AI Extension] - 2025-09-18

## [Added support for Windows] - 2025-08-07

## [Group milestones in MRs and Issues] - 2025-06-27

- Add group milestones to the issue create form
- Add group milestones to the MR create form

## [Add label filter on issues menu bar] - 2025-06-19

Add label filter on issues menu bar

## [Fix] - 2025-05-14

Fixed request loops that caused the extension to crash

## [Merge Requests Menu Bar] - 2025-05-13

- Added "My Merge Requests" view
- Added the ability to filter for labels

## [Fix] - 2024-12-17

- Fix "Ignore SSL Errors" setting not working on some features

## [Add Issues Assignment Filter] - 2024-10-16

- Add "Assigned to Me" filter to "Search Issues"

## [Add Projects Membership Filter] - 2024-09-03

- Add project membership dropdown filter to "Search Projects"

## [Todo Menubar Fix] - 2024-07-23

- [#13612](https://github.com/raycast/extensions/issues/13612): Don't show menubar item when there are no todo(s) present.

## [Fix] - 2024-04-23

- Fix limit of 50 users for user selection during Create Merge Request / Create Issue

## [Standardize Project Actions and List Items] - 2024-02-22

- Standardize project actions between Search Projects and Groups > Show Group views
- Reuse `<ProjectListItem>` for consistent future behavior

## [Add Issue State Filter] - 2024-02-16

- Add dropdown filter for issue state

## [Add Group Search] - 2024-01-26

- Add `Search Groups` command
- Update keyboard shortcut for project `Pipelines` command to `cmd`+`shift`+`P` to remove conflict with reserved shortcut for Raycast core

## [Fix] - 2023-10-21

- Fix possible crash in todo commands if the title is empty

## [Fix] - 2023-10-15

- Fix possible crashes in menubar items
- Fix possible crashes in label lists
- Catch error if launchCommand fails
- Fix menubar icon color on dark theme

## [Fixed unicode chars in title] - 2023-09-21

- Fixed an error with unicode chars in titles

## [Fixed menubar colors] - 2023-08-08

- Fixes the dynamic color for the GitLab Menu Bar command icons, specifically the Merge Request one.

## [Optimize Recent Activities] - 2023-07-02

- Add unsupported activity
- Rename `My Recent Activities` to `Recent Activities`
- `Recent Activities` got a dropdrown to switch between `My Activities` and `My Projects`
- Add `Merge Request Menu` command
- Add `Issues Menu` command
- Add group filter dropdown for epics
- `My Groups` only show one level at a time

## [Add Merge Request Template] - 2023-07-04

- Add template choice for merge request creation

## [Search Scope] - 2023-04-27

- Add scope dropdown for `Search Issues` and `Search Merge Requests`
- Add possibility to search for named parameters in `Search Issues` and `Search Merge Requests`.

## [Remove Branch] - 2023-04-17

- Add checkbox `Delete source branch` for a new MR (default state of project is respected)
- Milestones are now shown as tags instead of text in a list

## [Improve Starred Project Visibility] - 2023-03-16

- Use default color for non-starred projects so starred projects are more visible

## [Add Retry for Failed Jobs] - 2023-03-15

- Added ability to retry all failed jobs for a pipeline
- Added ability to retry a single job

## [Add Group and Project Wikis] - 2023-03-14

- Added wikis for groups and projects

## [Add Copy Clone Url] - 2023-02-24

- Added command to copy clone url of a project to clipboard

## [Allow Failure Jobs] - 2023-02-24

- Added indicators for jobs that are allowed to fail

## [Project Create New Issue] - 2023-02-03

- Added command to cerate new issue on a project

## [New Preference] - 2023-01-03

- Added preference to hide annoying bot created todos in the todo command

## [Add Todo Tags] - 2022-12-17

- Upgrade to Raycast 1.45
- Add Todo Tag to present the todo-reason
- Add ⚠️ to merge request when there is a kind of conflict

## [Fix crash] - 2022-12-07

- Fix crash which happens when cache is corrupted
- Add `Clear Local Extension Cache` action to most list items to be able to reset the local cache

## [Todos Menu Bar] - 2022-12-06

- Add Todos menu bar command
- Add tooltips to most command view
- Use modern raycast feature to display data
- Fix some bugs

## [Update] - 2022-10-11

- Add Open in Browser option in project navigation

## [Archive Indicator] - 2022-09-08

- Add an archived status indicator.

## [MR Details] - 2022-08-04

- Add date to list view MR details.

## [MR Details] - 2022-07-28

- Add a new setting to show details in merge request list via a metadata view.
- Switch `My Reviews` to use `MRListItem` to display merge requests.
- Upgrade Raycast API and fix resulting compilation errors.

## [Bugfix] - 2022-07-16

- Fixes an issue in the GitLab extension that was preventing fetching all the pages from the API, even though the all parameter was enabled.

## [Markdown Improvements] - 2022-07-08

- Render emojis from GitLab Flavored Markdown.
- Hide inline HTML tags from GitLab Flavored Markdown.

## [UI Improvements] - 2022-06-29

- Add TagList items to MR details to show assignees and reviewers.
- Pluralized the TagList.
- Hide metadata items when they are empty.
- Add key properties where necessary.

## [Bugfixes] - 2022-06-28

- Fix GraphQL errors related to [deprecated `ID!` type usage](https://gitlab.com/gitlab-org/gitlab/-/issues/352832).
  e.g. `Could not get Merge Request Details: Type mismatch on variable $id and argument id (ID! / MergeRequestID!)`

## [Custom Certs] - 2022-06-23

- Add support for custom certificates
- Add support for ignoring SSL errors

## [Projects list] - 2022-05-18

- Display project stars only if there are ([#1728](https://github.com/raycast/extensions/pull/1728))

## [Optimize] - 2022-04-03

- Set minimum Raycast version to `1.31`
- Increase project cache invalid time to `7` days
- Most commands use SWR cache to speedup operations
- Add Primary Action option to settings
- Add pop to root setting
- Add more details for issue and merge request
- Add `My Recent Commits` root command
- Merge requests and issue view can now be directly opened from `My Recent Activities` root command
- Fix relative markdown links to display images which get uploaded to GitLab directly
- Filter `My Merge Request`, `My Todos`, `My Recent Commits`, `My Open Issues`, `My Reviews` per project via CMD + P
- Most commands show CI Job status now if available
