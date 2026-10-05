# Spike Changelog

## [New Logo and Bug Fixes] - 2026-09-01

- Updated the extension icon and menu bar icon to Spike's new logo
- Menu bar icon now adapts to light and dark appearance
- Fixed `Open Incidents` and the menu bar command reading incidents from a response shape the API no longer returns, which left the list erroring and the menu bar permanently showing no open incidents
- Fixed the same incident appearing several times in `Open Incidents` as you scrolled, because pagination was sent in a form the API ignored and every page returned the first one
- Fixed `Open Incidents`, `My Oncall` and `Favorites` crashing with an unsupported navigation child instead of showing the error when a request fails
- Refreshed the App Store screenshots

## [BUG fixes] - 2024-11-19

- Fixed TypeError in `Who is oncall` command by adding proper null checks for oncall user profiles and metadata
- Update Readme

## [Initial Version] - 2024-11-04
