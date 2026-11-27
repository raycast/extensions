# Netherlands Railways Train Search Changelog

## [0.0.5] - {PR_MERGE_DATE}

- Load the station list once and filter it locally, instead of calling the API on every keystroke
- Fixed station search results not updating while typing
- Station list is cached, so the form opens instantly on later launches
- Station codes (e.g. "ASD") and synonyms (e.g. "Amsterdam CS") now match in search
- Removed the "Search Result Limit" preference, which no longer applies

## [0.0.4] - 2026-01-15

- Added "Reverse Direction" action to swap From and To stations (⌘R)

## [0.0.3] - 2025-12-17

- Added optional caching for last selected "From" and "To" stations
- Added "Remember Last Used Stations" preference setting to control caching behavior
- Updated typescript dependencies

## [0.0.2] - 2025-04-14

- Logo changed

## [Initial version] - 2025-04-14

- In this version, only one option is available: search for a specific train route.
