# Upcoming Holidays Changelog

## [Fixes] - 2026-01-30

- Fix holidays not loading (fixes [#24988](https://github.com/raycast/extensions/issues/24988))
- Switch to Nager.Date API v3 for holiday and country data
- Fetch supported countries from `/api/v3/AvailableCountries` instead of listing all countries
- Fetch public holidays from `/api/v3/PublicHolidays/{year}/{countryCode}` for current and next year
- Replace `useFetch` with `usePromise` in country detail for holiday loading
- Remove `country-locale-map` dependency
- Add package `version` and align TypeScript ESLint peer dependencies for `npm ci`

## [Updates] - 2025-12-18

- Add support for Windows platform
- Update dependencies to latest versions
- Refactored component to improve structure and error handling
- Added types for better type safety and clarity
- Updated TypeScript configuration for improved compatibility
- Adjusted ESLint configuration for better code quality

## [Initial Version] - 2022-06-04

- Allows to query the upcoming holidays for a given country.
