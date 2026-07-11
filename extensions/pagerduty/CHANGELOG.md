# PagerDuty Changelog

## [My Incidents Feature] - 2026-01-28

- Add new "My Incidents" command to filter incidents assigned to current user
- Extract shared TypeScript types and API client for code reusability
- Extract incident list item and status update components for consistency
- Add 30-day time window filter for My Incidents
- Fix: Add Content-Type headers for POST/PUT API requests
- Fix: Improve error handling with defensive checks
- Fix: Enable cache revalidation after incident status updates
- Refactor: Reduce main command file from 263 to 55 lines

## [Pagination + Modernize] - 2025-12-07

- Fetch more than the first 25 incidents
- Modernize to use latest Raycast configuration

## [Initial Version] - 2022-09-14

- Add command to list recent incidents
- Add actions to acknowledge/resolve each incident
