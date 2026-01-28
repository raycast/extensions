# Render Changelog

## [Add Configurable Default Action] - 2026-01-21

- Added preference to configure the default action when pressing Enter on a service
- Options: Show Details, Show Deploys, or Open in Render

## [Add Deploy Status Badges] - 2026-01-15

- Display deploy status badges on all services in the main list
- Show service-level "Suspended" status when applicable
- Support all Render API deploy statuses: Deploying, Deployed, Build Failed, etc.
- Color-coded badges: blue for deploying, green for deployed, red for failed, orange for canceled, gray for suspended
- Auto-refresh status every 5 seconds while deploys are in progress

## [Add Service Pinning] - 2026-01-14

Added ability to pin frequently used services to the top of the list.

## [Update Logo + Cache Results] - 2024-08-08

Through the use of `useCachedPromise` most results are now cached for better UX.

## [Add Render] - 2022-01-17

Initial version
