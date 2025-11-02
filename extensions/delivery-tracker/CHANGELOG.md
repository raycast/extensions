# Delivery Tracker Changelog

## [Major Refactor and Feature Additions] - {PR_MERGE_DATE}

### New Features
- **Delivery Notes**: Add optional notes to any delivery for better organization
- **Archive Functionality**: Archive delivered packages instead of deleting them with a dedicated "View Archived Deliveries" command
- **Menu Bar Extra**: New menu bar command showing delivery count and quick status overview with 10-minute auto-refresh
- **Carrier Icons**: Display carrier-specific favicons (USPS, UPS, FedEx) throughout the UI with themed fallback icons
- **List Sections**: Deliveries are now organized into intuitive sections (Arriving Today, In Transit, Delivered, Unknown Status)
- **Filtering & Search**: Filter by carrier and search by delivery name or tracking number in real-time
- **Enhanced Empty States**: Better empty views with contextual messages and quick actions

### Architecture Improvements
- **Service Layer**: Separated business logic into dedicated services (`deliveryService`, `trackingService`, `sortingService`)
- **Custom Hooks**: Created `useDeliveries` and `usePackages` hooks for cleaner state management
- **Type Organization**: Moved all type definitions to `src/types/` directory for better organization
- **TypeScript Strict Mode**: Enabled strict type checking for improved code quality
- **Code Reduction**: Reduced code duplication by ~40% through better separation of concerns

### UI/UX Improvements
- **Better Error Handling**: Improved error messages with batch error reporting for tracking updates
- **Organized Action Panels**: Actions are now grouped into logical sections with consistent keyboard shortcuts
- **Visual Hierarchy**: Added separators and better metadata organization in detail views
- **Carrier Identification**: Carrier icons and colors displayed consistently across all views

### Bug Fixes
- Fixed [#20613](https://github.com/raycast/extensions/issues/20613)
- Improved package cache management
- Better handling of missing or invalid carrier data

## [Manually Mark as Delivered and Delete All Delivered Deliveries] - 2025-04-10

Deliveries that are not remotely tracked can now be manually marked as delivered.  They will no longer be automatically
marked as delivered the day after the manual delivery date.

Added the ability to delete all the delivered deliveries.

## [Allow FedEx and UPS Offline Tracking] - 2025-03-26

Offline tracking of FedEx and UPS deliveries are now allowed.

Dependencies have been updated.

## [Prevent Duplicate Deliveries] - 2025-03-17

Duplicate deliveries are no longer allowed to be added.

## [FedEx Delivery Date Bug Fix] - 2025-03-07

Fixed a bug for the delivery date from FedEx.  People living in timezones with a negative UTC offset incorrectly saw
delivery dates a day earlier for FedEx.  This has been fixed.

FedEx and UPS carrier parsing was improved to support additional packages per tracking number.

## [Initial Release] - 2025-03-04

Tracks deliveries, packages, and parcels.

Has two commands to start: one to add a new delivery and one to view all the deliveries you're tracking.

Has initial support for the following carriers...
- UPS.
- FedEx.
- USPS.
