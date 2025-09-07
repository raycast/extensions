# Unsplash Changelog

## [Error Handling Enhancements] - {PR_MERGE_DATE}

- Fixed extension would crash when "Rate Limit" exceeded (ref: [Issue #21405](https://github.com/raycast/extensions/issues/21405))
- Centralized error handling into API
- Removed `node-fetch`

## [Add Pagination to Search] - 2025-04-09

- Added pagination and basic caching to "Search Images" and "Search Collections" (ref: [Issue #18189](https://github.com/raycast/extensions/issues/18189))
- Modernize extension: caching + clean up deps

## [Chore] - 2024-09-02

- Added missing contributor

## [Fix] - 2023-09-22

- Better handling of key and token

## [Fix] - 2023-04-28

- Fixed background updates not working.

## [Breaking Changes] - 2023-03-03

- Implement OAuth to access more data.
- Like/unlike an image feature.
- New UI for image item and collection details.
- Separate action to set wallpaper on every desktop.
- Random image will be set on every desktop now.
- Remove the orientation setting and use a Grid.Dropdown instead.
- Update screenshots.
- Overall UX and code improvements.

## [Fix] - 2022-11-28

- Updated API key URL

## [Added screenshots] - 2022-11-17

## [Update] - 2022-08-04

- Updated Raycast API to 1.38.2
- Added option to update random images.

## [Update] - 2022-06-28

- Updated Raycast API to 1.36.1
- Added Grid view
