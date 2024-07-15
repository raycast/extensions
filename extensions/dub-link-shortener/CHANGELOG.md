# Dub Link Shortener Changelog

## [Workspace API Keys] - 2024-07-11

- Supports newly launched [workspace api keys](https://dub.co/blog/workspace-api-keys) as user keys are deprecated
- If workspace keys are used or if there is only one workspace for use, the workspace dropdown is not rendered

## [Improvements] - 2024-06-28

- Search Links: Improved the UX, added metadata and a workspace selection accessory
- Shorten Links: Added form options for workspace, tags, domain and improved UX
- Replaced project slug with workspaceId as slug is deprecated now
- Used React hooks from @raycast/utils and upgraded dependencies

## [Enhancement: Remove long URL in the list view for clarity] - 2024-02-07
- Take in urlKey that sets a custom short URL
- Support arguments inline to the shorten link command

## [Enhancement: Remove long URL in the list view for clarity] - 2023-12-21
- Showing both the shortened & long URL was cluttering the list view, so removing the long URL for now

## [Enhancement: Show the shortened and long URL in the list view] - 2023-12-14
- Be consistent with the web app and show both the short and long URL for each item in the list view

## [Enhancement: Better feedback and UX] - 2023-12-06
- More specific language around copying to clipboard
- Showing the shortened link as pop up text after successfully shortening

## [Initial Version] - 2023-11-15
