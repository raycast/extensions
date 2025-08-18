# Change Case Changelog

## [Add `hide HUD` preference] - 2025-08-18
- Added a preference to hide the HUD after the action

## [Add `preserve punctuation` preference] - 2025-07-15
- Added a preference to preserve punctuation when transforming text to Lower Case or Upper Case

## [Focus last used case] - 2024-11-24
- Focus the last used case when opening the extension

## [Fix logic regarding preserve casing] - 2024-09-02
- Properly handle the logic regarding the `Preserve Casing` preference
- Rewrote some of the documentation to make it clearer
- Handle `KEBAB-UPPER-CASE` transform correctly
- Add preference for prefix and suffix characters
- Handle `Upper case` properly
- Handle `lower case` properly
- Added missing contributor

## [Visual improvements] - 2024-06-07
- Small improvement to some UI copy meant to make the lowercasing behavior for Title and Sentence Case transformations clearer.

## [Add `KEBAB-UPPER-CASE` transform] - 2024-06-04
- Added `KEBAB-UPPER-CASE` transform

## [Add `preserve casing` preference] - 2024-06-01
- Removed the redundant cases: param (same as kebab), macro (same as constant), sponge (same as random), train (same as header)
- Added a preference to add exceptions to the list of words that should not be modified when transforming the text to title case or sentence case

## [Add preference to lowercase text before changing case] - 2024-05-22
- Added a preference to lowercase all inputs before changing case

## [Clarify Behavior in README]- 2024-05-19
- Added README.md with more information about the behavior of the extension

## [Fixes] - 2024-5-02
- Fixed using action style as destructive
- Fixed `Pascal Snake Case` being incorrectly named as `Pascal Case` in preferences

## [Fixed overlapping keyboard shortcuts and a wrong setting] - 2024-04-26
- Fixed the issue where some key combinations were mapped to multiple commands at the same time.
- Fixed the inverted `popToRoot` setting.

## [Fix to View of Detail] - 2024-03-20
- Fixed so that line breaks are displayed as new lines

## [Add Pop to Root Preference] - 2024-03-07
- Added pop to root as a default preference

## [Better Sentence Case] - 2024-01-28
- Sentence case now handles punctuation better

## [Fix Quicklink] - 2023-12-27
- Fixed quicklinks not respecting the `Primary Action` preference.

## [Manual Refresh] - 2023-11-27
- Added a manual refresh action to refresh the selected text/clipboard

## [Add Keywords] - 2023-11-13
- Added a few keywords to make searching in the store easier

## [Update Dependencies] - 2023-10-18
- Switch to ESM-only packages because they are now supported

## [Update] - 2023-10-03
- Support unicode characters
- Package dependencies with the extension because ESM-only packages are not supported yet

## [Support Quicklinks] - 2023-09-07

- Added support for quicklinks to quickly convert to a selected case

## [Update] - 2023-08-08

- Support change case for multi lines

## [Added new case] - 2023-05-15

- Added Slug case

## [Update] - 2023-03-27

- Added a list detail view for a better view of the modified text
- Added the ability to pin cases
- Added recent cases

## [Update] - 2023-03-21

- Updated API
- Added so it's possible to select copy or paste as default action

## [Update] - 2022-12-23

- Make use of the `getFrontmostApplication` API.

## [Update] - 2022-10-05

Added Sponge Case

## [Update] - 2022-08-10

- Updated Raycast API.
- Fix typo.
- Added a small preview to description.
