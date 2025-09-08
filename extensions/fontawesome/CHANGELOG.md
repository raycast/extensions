# Font Awesome Changelog

## [Feat: Add Support for Windows] - {PR_MERGE_DATE}

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
