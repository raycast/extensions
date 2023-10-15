# Search npm Changelog

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
