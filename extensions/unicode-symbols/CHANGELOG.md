# Unicode Symbols

## [Improvements] - 2024-09-20

- Added extra characters to Superscript and Subscript set ([#14533](https://github.com/raycast/extensions/issues/14533))
  - This is purely a visual thing, doesn't change the actual character sets
  - Also added an indicator to show that this character is actually in a different set
- Fix issue where the extension breaks on `Ancient Symbols` in List Mode ([#14562](https://github.com/raycast/extensions/issues/14562))
- Improve search, wasn't properly filtering characters in Fuse.js
- Update to `unidata16`, which uses the latest `16.0.0` Unicode data
- Updated dependencies

## [Filter irrelevant characters] - 2024-05-21

- Added a filter to remove irrelevant characters from the list (#12487)

## [Add Latin Extended Additional] - 2024-03-11

- Added the Latin Extended Additional character set, totalling to 5195 characters
- Updated dependencies

## [Add symbol search] - 2024-02-08

- Added the ability to search for the exact symbol. This works with the integer code (e.g. `U+1F600`), the hex code (e.g. `1F600`) or the symbol itself (e.g. `😀`).
- Bump dependencies
- Minor bugfix: Not showing the following symbols correctly in grid: `&<>`

## [Minor bugfix] - 2023-12-13

- Fixed a minor bug that breaks the item grid over cached items (#9664)

## [Major refactor] - 2023-12-01

- Upgraded `@raycast/api@^1.63.0` and other dependencies
- Added 'Grid' view (now the default view)
- Added a Character set selector to the search bar
- Added an option to copy the HEX code of the selected character (used in development of html/css)
- Added an option to copy the HTML entity of the selected character (used in development of html)
- Added extra character sets, totalling to 4940 characters
- Refactored a large portion of the code to make it more maintainable
- Updated screenshots

## [Added a few aliases] - 2022-12-06

## [Added screenshots] - 2022-11-17

## [Added some common symbols] - 2022-03-21

- Added , ⌘, ⌥, ⏎, ⌫ to the list

## [Unicode Symbols extension] - 2021-11-17

- Added first version of Unicode Symbols
