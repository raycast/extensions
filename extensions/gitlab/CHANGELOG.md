# GitLab Changelog

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
