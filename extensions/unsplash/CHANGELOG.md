# Unsplash Changelog

## [Windows Support] - 2026-06-29

- Added Windows support for setting wallpaper, copying images to clipboard, and saving images
- Wallpaper: uses PowerShell + Win32 SystemParametersInfo on Windows
- Clipboard: uses PowerShell System.Windows.Forms on Windows
- Save: downloads to Desktop on Windows (folder picker is macOS-only)

## [Modernize & OAuth Setup Guide] - 2026-05-28

- Added OAuth setup guide shown before login — displays the required redirect URI and a Connect button so users can set up their Unsplash app without confusion
- Fixed crashes caused by unhandled OAuth errors (`TypeError: Cannot read properties of null (reading 'useState')`)
- Migrated deprecated `Grid.itemSize` / `Grid.ItemSize` to `columns` prop
- Exported all types, merged `LikesResult` into `SearchResult`, extended `User` with optional fields
- Extracted shared `OrientationDropdown` component used by Search Images and Search Collections
- Simplified `useSearch` hook — removed intermediate `performSearch` abstraction
- Moved module-level `getPreferenceValues` calls inside functions to avoid side effects on import
- Removed `React.FC` annotations and noisy section comments throughout
- Fixed missing `await` on `LocalStorage.setItem` in likes hook

## [Keyboard Shortcut Updates] - 2026-05-12

- Added Raycast common keyboard shortcuts
- Ignored `node_modules`
- Bump Raycast dependencies

## [Error Handling Enhancements] - 2025-09-09

- Fixed extension would crash when "Rate Limit" exceeded (ref: [Issue #21405](https://github.com/raycast/extensions/issues/21405))
- Fixed `Toast` would say "Liking" when _unliking_
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
