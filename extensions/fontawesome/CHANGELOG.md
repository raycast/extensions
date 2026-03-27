# Font Awesome Changelog

## [Fix pro token refresh and kit loading] - 2026-03-27

- Fixed pro icon searches after changing the API token by scoping cached access tokens and expiry timestamps to the selected API token, which prevents the extension from continuing to use the default free token after a pro token is added (ref: [Issue #26096](https://github.com/raycast/extensions/issues/26096#issuecomment-4013620785)).
- Scoped cached icon and kit data to the active token/style selection so custom kit results and pro search results no longer bleed across token changes.
- Updated custom kit handling to rely on Font Awesome kit tokens instead of a nonexistent `Kit.id` field when filtering, selecting, and loading kit uploads.

## [Added Custom Kits Support for Pro accounts] - 2025-11-25

- Added support for browsing and searching custom kit icons
- Added "Remember Last Used Kit" preference to restore your previous selection on launch
- Added "Filter Custom Kits" preference to limit which kits appear in the dropdown

## [Improvements] - 2025-10-13

- Fixed issue where the search would sometimes fail and the cached state gets corrupted (ref: [Issue #22051](https://github.com/raycast/extensions/issues/22051))
- Refactored code to use hooks/components/utils for better readability

## [Fix: Search would get stuck] - 2025-09-29

- Fixed issue where search would get stuck since token was not persisted (ref: [Issue #21781](https://github.com/raycast/extensions/issues/21781))
- Simplified some code by replacing `useEffect` with `useLocalStorage`

## [Fix: Unused Dependencies deleted] - 2025-09-15

- Remove `svg-to-png` and `change-case` dependencies
- Bump `@types/node`

## [Feat: Add Support for Windows] - 2025-09-09

- Add support for Raycast Windows
- Bump dependencies to latest versions

## [Added AI icon search, Sharp Duotone and Duotone families] - 2025-06-22

- The extension now supports v6.7.2.
- Added support for the Solid, Regular, Light and Thin styles for both Sharp Duotone and Duotone families.

## [Added primary action preference] - 2024-10-23

- Added a primary action preference to configure the main action for the icon.

## [Fixed the issue with the copied icon SVG] - 2024-06-26

- Fixed issue with icon "Copy as SVG" copies [object Object] onto the clipboard instead of the SVG.

## [Added fuzzy search and icon style and family selection] - 2024-06-02

- Search command now uses Font Awesome's official graphql APIs to support fuzzy search. It is now faster, more accurate and shows similar icons to your query.
- Added support for switching between different icon families and styles.

## [Added action] - 2023-06-26

- Added "Copy FA Class" action which copies Font Awesome classes, e.g. "fa-brands fa-chrome".

## [Added action] - 2023-02-28

- Added "Copy FA Glyph" action which copies the unicode font-awesome glyph to clipboard for use with font-awesome font files

## [Removed HTTP Proxy] - 2023-02-28

- Updated extension to make use of Raycast's image coloring API instead of proxying the HTTP request and modifying the SVG.

## [Added action] - 2022-11-05

- Added "Copy FA Slug" action

## [Initial Version] - 2022-10-16

- Removed static icons files
- Added iconography fetching from Font Awesome API
- Added icon filtering capabilities
- Changed copy to SVG functionality to use new CDN structure

## [Initial Version] - 2022-10-07

- Add search for (regular) Font Awesome icons
- Add copy as SVG
- Add Open In Browser
