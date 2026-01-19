# Withings Sync Changelog

## [2.0.1] - {PR_MERGE_DATE}

### Bug Fixes

- **Weight Unit Display**: Fixed bug where weight measurements were always displayed in kg regardless of user preference setting. Weight now correctly displays in pounds (lb) or kilograms (kg) based on the "Weight Unit" preference.
- **Garmin Data Check Date Range**: Fixed bug where "Check Garmin for Existing Data" would miss measurements that occurred later in the day. Now extends the end date to end of day (23:59:59) to ensure all measurements are found.

## [2.0.0] - 2026-01-18

Major feature update with enhanced sync capabilities.

### New Features

1. **Configurable Lookback Days**: Set default number of days to fetch measurements in preferences (default: 7)
2. **Smart Sync Since Last Garmin Entry**: Automatically finds your last Garmin weight entry and syncs only newer Withings measurements
3. **Custom Date Range Sync**: Sync specific date ranges up to 90 days with validation
4. **Garmin Duplicate Detection**: Check existing Garmin data and sync only new measurements
5. **Bulk Forward Sync**: Select a measurement and sync it plus all newer measurements (Alt+Enter)

### Keyboard Shortcuts

- `⌘S` - Smart sync only measurements newer than last Garmin entry
- `⌘L` - Check last Garmin entry date
- `⌘N` - Sync only new measurements (after checking Garmin)
- `⌥Enter` - Sync selected measurement + all newer
- `⌘G` - Check if measurement exists in Garmin

### UI Improvements

- Added "Sync Custom Date Range" action with date picker form
- Added "Check Garmin for Existing Data" action with visual feedback showing "X new, Y already synced"
- Enhanced measurement actions with forward sync and duplicate checking
- Dynamic empty view message based on configured lookback days
- Duplicate detection warning badge shows when multiple entries exist for same day
- **Visual Status Badges**: Each measurement shows "New" (orange) or "Synced" (green) status after checking Garmin data

### Bug Fixes

- **Duplicate Upload Prevention**: Now checks Garmin before uploading to prevent creating duplicate entries
- **Auto-refresh After Sync**: Automatically refreshes Garmin data after sync operations to show accurate status
- **Cache Management**: Properly clears cached Garmin data to ensure fresh checks
- **Duplicate Count Tracking**: Detects when multiple measurements exist for the same day in Garmin
- **Unit Conversion Fix**: Fixed critical bug where Garmin weight data was in grams but treated as kilograms, preventing duplicate detection
- **Body Water Sync**: Added support for syncing body water/hydration percentage to match Python tool functionality

### Technical Improvements

- Added `count` field to track number of measurements per day in Garmin
- Improved date-based comparison using calendar date strings
- Added 2-second delay after sync for Garmin API indexing
- Enhanced error handling for duplicate detection

### Breaking Changes

None - fully backward compatible

---

## [Initial Version] - 2026-01-18

Initial release of Withings Sync extension.

### Features

- View Withings measurements (weight, blood pressure, heart rate, body composition)
- Sync measurements to Garmin Connect
- Quick "Sync Today's Data" action to upload all measurements from today
- Support for complete body composition data (weight, body fat, bone mass, muscle mass)
- Optional blood pressure sync
- Secure OAuth authentication for Withings
- Session-based authentication for Garmin Connect
- Weight displayed in pounds (lbs)
