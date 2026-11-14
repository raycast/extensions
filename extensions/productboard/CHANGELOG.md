# Productboard Changelog

## [Migrate to v2 API] - {PR_MERGE_DATE}

- Fixed extension not working due to deprecation of v1 API (ref: [Issue #31244](https://github.com/raycast/extensions/issues/31244))

## [View `Objectives` + Modernize] - 2025-09-09

- `Objectives` command allows you to view objectives
- Improved API to handle another error case
- Modernized to use latest Raycast config
- Removed `got`, `isemail`

## [Add `Notes` Command] - 2024-07-02

### Enhancements

- `Notes` command allows you to see all of your existing notes
- `Add Note` is now a subcommand within `Notes`

### Other

- Added `Changelog`
- chore + lint
- Added `useProductboard` hook for pagination and fetching

## [Initial Version] - 2021-11-29