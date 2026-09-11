# Kobbe Changelog

## [Fix Stale Live Count] - 2026-08-29

- Hide the menu bar visitor count while a refresh has failed, instead of presenting the previous total as current.

## [Live Visitors and New Commands] - 2026-08-29

- Add Live Visitors menu bar command showing who is online right now across your sites.
- Add Top Sources command backed by the Kobbe sources endpoint.
- Add Setup Health command to check tracker installation and revenue webhook status.
- Add a time range switcher to overview, top pages, and sources views.
- Add site favicons and tinted metric icons for a richer dashboard feel.
- Cache API responses so commands open instantly with the latest known data.
- Add a Primary Action preference to choose whether Enter on a site opens the dashboard in the browser (default) or the overview in Raycast.
- Fetch live visitor counts through a single batch endpoint instead of one request per site, with a capped per-site fallback for older self-hosted servers.
- Resolve source favicons and titles from referrer origins so they display as clean hostnames.

## [Update] - 2026-06-19

- Address Raycast review feedback: remove unused assets, use generated preferences type, fix locale formatting, and unify metadata screenshots.

## [Initial Release] - 2026-06-19

- Add commands to search Kobbe sites, view overview metrics, inspect top pages, and review revenue.
- Add read-only API token setup through Raycast preferences.
- Add metadata screenshots and setup documentation.
