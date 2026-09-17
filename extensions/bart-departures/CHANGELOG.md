# BART Departures Change Log

## [Initial Release] - 2026-08-14

- Added the **BART Departures** Raycast command for viewing real-time departure estimates at a selected BART station.
- Added searchable station selection sourced from BART's station-list API.
- Added departure details including destination, time until departure, BART line color, platform, and direction.
- Added filtering, manual departure refresh, and a Change Station action.
- Remember the last selected station between launches with Raycast LocalStorage.
- Added loading, empty-state, and retry experiences for unavailable data or failed BART API requests.
- Added optional **BART API Key** preference to override the shared default API key.
