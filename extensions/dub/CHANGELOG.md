# Dub Link Shortener Changelog

## [Typeahead Support] - 2024-12-04

- Add typeahead support for short links to load more that 100 links [#14198](https://github.com/raycast/extensions/issues/14198)
- Bump dependencies to resolve critical vulnerabilities

## [Chore] - 2024-10-23

- Bump dub sdk to v0.43.9
- Fixed an issue where links were not loading when `link.userId` is null

## [Renaming and Fixes] - 2024-08-01

- Rename extension from `dub-link-shortener` to `dub`
- Transfer to `dubinc` organization
- Fixed retry for shortening failures and open short links within toast with a push.

## [README changes] - 2024-07-31

- Remove the instructions about API key from README.

## [OAuth flow] - 2024-07-30

- Added OAuth flow to connect to Dub account

## [Workspace API Keys] - 2024-07-19

- Simplify Dub Raycast Extension by using [`dub` TypeScript SDK](https://dub.co/solutions/typescript)
- ⚠️This is a breaking change if you are using _User API Keys_. Please switch to using [Workspace API keys](https://dub.co/blog/workspace-api-keys) to continue using the extension.

## [Minor metadata updates] - 2024-07-16

- Updated the title, description, logo, and auth instructions

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
