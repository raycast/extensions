# Delivery Tracker Changelog

## [Major Refactor and Feature Additions] - 2025-11-04

### New Features
- **Delivery Notes**: Add optional notes to any delivery for better organization and context
- **Archive Functionality**: Archive delivered packages instead of deleting them with a dedicated "View Archived Deliveries" command and unarchive capability
- **Menu Bar Extra**: New menu bar command showing delivery count badge, quick status overview of arriving today and in-transit packages, and auto-refresh every 30 minutes
- **Background Refresh**: Automatic tracking updates every 30 minutes with silent operation and HUD notifications for delivered packages
- **Auto-Carrier Detection**: Automatically detects and selects carrier based on tracking number patterns (UPS: 1Z format, FedEx: 12-14 or 20 digits, USPS: 20-22 digits)
- **Carrier Icons**: Display carrier-specific favicons (USPS, UPS, FedEx) throughout the UI with themed fallback icons for visual identification
- **List Sections**: Deliveries are now organized into intuitive sections (Arriving Today, In Transit, Delivered, Unknown Status) with item counts
- **Filtering & Search**: Filter by carrier and search by delivery name or tracking number in real-time with color-coded carrier icons in dropdown
- **Enhanced Empty States**: Better empty views with contextual messages (no deliveries vs. no search results) and quick action buttons

### Architecture Improvements
- **Service Layer**: Separated business logic into dedicated services (`deliveryService` for CRUD operations, `trackingService` for refresh logic, `sortingService` for grouping)
- **Custom Hooks**: Created `useDeliveries` and `usePackages` hooks for cleaner state management and reusability
- **Utilities**: Added `carrierDetection.ts` for automatic carrier detection from tracking number patterns
- **Type Organization**: Moved all type definitions to `src/types/` directory for better organization and maintainability
- **TypeScript Strict Mode**: Enabled strict type checking (`strict`, `noImplicitAny`, `strictNullChecks`) for improved code quality
- **Modern JavaScript**: Updated to ES2023 lib for modern array methods like `toSorted`
- **Code Reduction**: Reduced code duplication by ~40% through better separation of concerns and reusable components

### UI/UX Improvements
- **Better Error Handling**: Improved error messages with batch error reporting for tracking updates and graceful fallbacks
- **Organized Action Panels**: Actions are now grouped into logical sections (Primary Actions, Status Management, Danger Zone) with consistent keyboard shortcuts
- **Visual Hierarchy**: Added separators and better metadata organization in detail views with carrier colors
- **Carrier Identification**: Carrier icons and colors displayed consistently across all views (list, detail, menu bar)
- **Keyboard Shortcuts**: Comprehensive shortcuts including `Cmd+Shift+A` for archive, `Cmd+D` for manual delivery toggle, and more

### Data Model Updates
- Added `archived?: boolean` field to track archived deliveries
- Added `archivedAt?: Date` field to record when delivery was archived
- Added `notes?: string` field for user-provided delivery notes
- All changes are backward compatible with existing data

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
