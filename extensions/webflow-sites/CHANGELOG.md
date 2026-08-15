# Webflow Extension by Peeks Changelog

## [API Update] - 2025-01-07

- Extension now uses v2 of the Webflow API
- ❗ Users will need to log in again since the previous OAuth has been deprecated
- View Site Assets

## [Enhancements] - 2024-09-12

- Update logos
- "New Site" action has a shortcut

### Dev Notes
- Migrate ray and deps
- Utilize props of `useFetch` for more control of toasts
- Move the sort into `mapResult`
- Add TS type for SiteV1 removing use of "any"

## [Initial Version] - 2022-11-29

- Added `Open Sites` command
- List all Webflow sites
- Open site in Webflow designer
- Fetch Favicon for live site
- Added lot's of actions ex. open site settings, account settings etc.
