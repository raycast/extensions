# Changelog

## [Capacities Integration] - 2026-08-23

- Added an "Add as Cover in Capacities" action that uploads a result's cover art to Capacities and links it to the matching object
- The Capacities object type(s), cover property, and image collection are all configurable by name in preferences — no internal IDs needed
- Multiple object types can be matched at once (e.g. `Media, Games`), each with its own cover property
- Results now show image dimensions alongside the title's type
- Renamed the extension to "Cover Art Search" to match what it actually does

## [Replace deprecated Google API] - 2026-08-08

- Replaced the deprecated Google Custom Search JSON API with IMDb's own search-suggestion endpoint, covering movies, TV, anime, and games in one search
- Results now show an IMDb type badge (e.g. "Movie", "TV Series", "Video Game") and image dimensions
- Results now include a "View on IMDb" action

## [Initial Version] - 2025-06-16
