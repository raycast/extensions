# Parcel Changelog

## [Detail View Refactor, Metadata, UX] - {PR_MERGE_DATE}

- Refactored "My Deliveries" command UI to only show tracking events in the markdown section (all other details are now displayed in the metadata panel for improved clarity and structure)
- Added support for Portuguese date formats in tracking events
- Removed redundant "View Recent/Active Deliveries" action (filtering is now handled exclusively by the dropdown)

## [Expected Delivery Date Formatting Overhaul] - 2025-06-12

- Delivery windows now show the full time range when available (e.g., "12 Jun 10:45 – 12:45"), so you know exactly when to expect your package.
- Times are shown when provided by the carrier, making delivery info more precise.
- Dates are now easier to read: you'll see "Today", "Tomorrow", weekday names, or a simple date, depending on when your package is due.

## [Enhanced Date Format Support] - 2025-06-03

- Added support for more date formats in delivery tracking, including dates with day names
- Improved handling of various international date formats for better compatibility with carrier APIs

## [Added ISO 8601 Date Support] - 2025-05-30

- Added support for ISO 8601 date format (YYYY-MM-DD HH:mm:ss) in delivery date parsing
- Improved date format handling for better compatibility with various carrier APIs

## [Improved Date Handling] - 2025-05-28

- **Enhanced date recognition:** Improved parsing of delivery dates, including better support for European formats (like DD.MM.YYYY HH:mm and DD.MM.YYYY HH:mm:ss).
- **More reliable display for unknown dates:** Unspecified or unparseable dates will now more consistently display as "Not available", providing clearer information.

## [Track on Website, Cache] - 2025-04-12

- Added "Track on Website" action to open the carrier's tracking page in the default browser
- Use Raycast's `useFetch` hook to enable API response caching and improved/simplified error handling
- Share API client functionality between component and AI tools

## [Added Package Tracking] - 2025-03-19

- Added "Add Delivery" command with a form interface to add new deliveries to Parcel
- Added support for both labeled and unlabeled package tracking using Parcel's protocol handlers
- Added automatic window closing after adding a package for a seamless experience
- Improved documentation in README with detailed command instructions

## [Initial Version] - 2025-02-28

- Added "My Deliveries" command to display active and recent deliveries
- Implemented detailed delivery view with package information
- Added tracking history display with chronological event listing
- Added action to copy tracking numbers
- Added support for filtering between active and recent deliveries
- Created a clean UI with color-coded status indicators and delivery timeframes
