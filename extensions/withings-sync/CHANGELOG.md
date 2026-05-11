# Withings Sync Changelog

## [Initial Version] - 2026-02-05

- Added configurable lookback days preference (default: 7 days)
- Added Smart Sync to automatically find last Garmin entry and sync only newer measurements
- Added Custom Date Range sync for specific date ranges up to 90 days
- Added Garmin duplicate detection to check existing data before syncing
- Added Bulk Forward Sync to sync selected measurement plus all newer ones
- Added visual status badges showing "New" or "Synced" for each measurement
- Added keyboard shortcuts: ⌘S (Smart Sync), ⌘L (Check Last Entry), ⌘N (Sync Only New), ⌘G (Check in Garmin)
- Fixed duplicate upload prevention
- Fixed unit conversion bug where Garmin weight was in grams but treated as kilograms
- Added body water/hydration sync support
- View Withings measurements (weight, blood pressure, heart rate, body composition)
- Sync measurements to Garmin Connect
- Quick "Sync Today's Data" action to upload all measurements from today
- Support for complete body composition data (weight, body fat, bone mass, muscle mass)
- Optional blood pressure sync
- Secure OAuth authentication for Withings
- Session-based authentication for Garmin Connect
