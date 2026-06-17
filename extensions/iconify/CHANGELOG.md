# Iconify Changelog

## [Docs] - 2025-12-24

- Add cross-extension badge and credits part to README

## [Features] - 2025-12-19

- Fix icon custom color rendering issue
- Support picking icon color

## [Features] - 2025-12-18

- Add `iconNameFormat` preference to control how icon names are formatted
- Introducing Jest to make sure icon names are generated correctly

## [Error Guard] - 2025-12-16

- Add `ErrorGuard` component that makes it a bit more friendly when there is an error, instructing the user to reinstall/clear cache/check internet connection

## [Improvements] - 2025-12-16

- Refactor code to make it better maintainable
- Remove axios as we can use fetch from Node
- Add `abortable` options to `usePromise` to make sure any requests are aborted on changes
- Add Windows support

## [Improvements] - 2025-12-02

- Add error handling in "Search Icons"
- Add README.md

## [Improvements] - 2025-03-20

- Add preference for custom color

## [Improvements] - 2025-03-10

- Add action to copy icon data URI

## [Improvements] - 2025-02-14

- Add "Paste SVG File" to actions and primaryActions
- Add "Copy SVG Name" and "Copy SVG URL" to the primary actions preference.

## [Improvements] - 2024-06-14

- Add "Copy SVG File" to actions and primaryActions
- Change "Copy SVG" to "Copy SVG String"
- Change "Paste SVG" to "Paste SVG String"
- Add "Monochromatic Icon Color" to primaryActions

## [Improvements] - 2024-03-27

- Add "Paste Name" to actions and primaryActions

## [Fix] - 2023-03-30

- Fix searching when viewing large icon sets that are paginated.

## [Improvements] - 2023-03-06

- Display icons using a `Grid` instead of `List`
- Add pagination to `View Icons` command

## [Fix] - 2023-03-01

- Fix the `Search All Icons` command crashing after typing.

## [Improvements] - 2022-06-26

- Add "Copy Name" action
- Add "Copy URL" action
- Add preference for Primary action
- Improve performance

## [Improvement] - 2022-04-12

- Add "Search All Icons" command

## [Add Icons] - 2022-03-24

- Initial version
