# SimpleLogin Changelog

## [Enable Alias Description Prefill Based on Active Browser Tab URL] - 2024-06-19
* Added a new preference option: "Prefill Alias Description".
* When enabled, the default alias description will be automatically populated using the hostname of the active browser tab.
* (Side Note) Bump Raycast API package version

## [Updates to List Aliases & Create Random Alias commands] - 2024-06-05
- Update List Aliases command to cache previously fetched aliases so that aliases can be viewed before refetch
- Add new search bar filters to support filtering by aliases with and without a description
- Update Create Random Alias command to support taking in a description for the alias

## [Updates to List Aliases command] - 2024-04-19
- Updated search functionality to also search by email and description
- Updated UI naming to match SimpleLogin UI (Note -> Description, Name -> Display Name)
- Updated dependencies

## [Initial Version] - 2023-01-17
Initial version with the following features:

- List all aliases with filter for pinned ones
- create a new custom alias
- create a random alias
