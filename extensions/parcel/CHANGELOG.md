# Parcel Changelog

## [Improved Date Handling] - {PR_MERGE_DATE}

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
