# NixPkgs Search Changelog

## [Update] - 2025-12-04

- Consolidate actions for opening package homepage and source code
- Add keyboard shortcuts for improved accessibility
- Remove redundant sections for cleaner UI
- Addesses feedback from [Issues #23406](https://github.com/raycast/extensions/issues/23406)

## [Update] - 2025-11-26

- **In-app branch switcher**: Added a dropdown in the search bar to switch between NixOS versions without going to preferences
- **Updated available branches**: Removed unsupported branches (24.11, 24.05, 23.11) and kept only working versions (unstable, 25.05)
- **Simplified preferences**: Removed static branch configuration from preferences in favor of runtime selection
- **Improved localStorage handling**: Cleaned up storage logic with proper Promise handling
- Bump dependencies to latest versions.
- Added copy action to package details view.
- Added Windows as supported platform.

## [Fix] - 2025-11-10

- Change search URL by parsing frontend version to match the upstream change.

## [Fix] - 2025-05-13

- Compose URL with a version number fetched from [NixOS/nixos-search](https://github.com/NixOS/nixos-search/tree/221d27a68edad8dc291de4bb3fa208d471c46947).
  - This will prevent issues like [#18939](https://github.com/raycast/extensions/issues/18939).

## [Enhancements] - 2024-11-13

- Fix crash when no "Hompage" for a package ([Issue #15189](https://github.com/raycast/extensions/issues/15189), [Issue #15327](https://github.com/raycast/extensions/issues/15327))
- Reduce code by utilizing `useFetch`

## [Fix] - 2023-08-01

- Updated URL for search index endpoint.

## [Fix] - 2023-03-07

- The url used by the NixPkgs Search has changed, so I have updated it accordingly.

## [Initial Version] - 2022-08-24
