# Search npm Changelog

## [Fixes] - 2025-02-05

- Fix URL parsing issue

## [Added a shortcut] - 2025-01-22

- Added a shortcut to copy the package version

## [Chore & Fixes] - 2025-01-13

- Hide toast when `historyCount` is zero
- Suppress errors when search term is empty
- Use Raycast's auto-generated type definitions
- Bump all dependencies to the latest

## [Update] - 2024-12-14

- Fixed another issue with git url parsing
- Added more detail to the history view. If there's a package there, it will be displayed like in the package list which means it is much quicker to access the package you previously searched for.

## [Update] - 2024-12-13

- Added a Git URL parser for the repository URL in the open repository action

## [Updates] - 2024-10-07

- Hide history list when `historyCount` is zero
- Bump all dependencies to the latest

## [Refactoring] - 2024-02-03

- Bump dependecies
- Refactored readme to hook
- Cleanup code, removed library
- Add link to esm.sh

## [Added a link to npm search results page] - 2023-11-23

- Added a link to npm search results page when searching for a package & add a preference to show or hide this link
- Make `tag` accessory optional & move it to 1st position
- Bump dependencies

## [Added a shortcut] - 2023-08-20

- Added a shortcut to open the package's npm page

## [Favorites and history] - 2023-03-29

- Added ability to favorite packages and display them in a new view
- Added search history and display them in a new view

## [Added open changelog] - 2023-03-15

- Added action to open the package's changelog (only for github)

## [Fixed Yarn install command] - 2022-11-11

- Fixed yarn install command since it's different than npm/pnpm

## [Added a bunch of new feedback] - 2022-09-05

- Added a cache for faster results
- Switch back to the result of npm instead of npms.io which provided some outdated results

## [Added a bunch of new feedback] - 2022-05-04

- updated to the latest `@raycast/api` package version and refactored based on any new APIs and deprecations
- added [pnpm](https://pnpm.io) as an option for default package manager. Now there are three: `yarn`, `npm` and `pnpm`, which meant the existing logic for choosing a default and alternate was not sufficient
- added new option for secondary package manager. This helps with the above point so users can explicitly choose the secondary/fallback package manager
- add link to [Skypack.dev](https://skypack.dev) for each package
- updated the default open action to include new Skypack.dev link
- added more information to the list item's `accessories`, now you can view the latest publish version, when the package was last published and the npms.io score for that package
- added image metadata

## [Add default action pref] - 2022-12-13

- Users can now decide what to do when they press Enter on a entry row.​

## [Refactor] - 2021-11-04

- use npms "suggestions" endpoint instead of "search" endpoint. This improves loading times and also
- improved code organisation by moving components into their own files
- organised actions into groups
- added "Copy Package Name" actions
- moved components and utils into better file structure
- improved the organisation and grouping of actions
- improved the docs

## [Add copy action pref] - 2021-10-29

- adds a preference for choosing a default package manager (yarn or npm) and keyboard shortcuts for copying the install command based on this preference.

## [Added extension] - 2021-10-20

Initial version code
