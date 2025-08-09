# Changelog

All notable changes to the EZ Timezone Converter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0]

### Added
- Initial release of EZ Timezone Converter
- **Convert Timezone** command with interactive form interface
  - Multiple time input formats support (1, 10 AM, 10 PM, 14, 2:30 PM, 14:30)
  - Date picker for specific date conversions
  - Common timezone dropdown selections
  - Real-time conversion results display
  - Copy result functionality
- **World Clock** command showing live times
  - Real-time updates every second for 13 major cities worldwide
  - Copy time or timezone information to clipboard
  - UTC offset display for each timezone
- **Quick Convert** command for fast conversions
  - No-UI command with arguments for instant conversion
  - Supports timezone abbreviations (EST, PST, GMT, UTC, JST, IST, etc.)
  - Automatic clipboard copying of results
  - Toast notification with conversion details
- Auto-detection of user's current timezone as default "From Timezone"
  - Uses system timezone automatically
  - Visual indicator (🏠) for current timezone in dropdown
  - Intelligent handling of both common and uncommon timezones

### Features
- **Flexible Time Input**: Supports various formats including:
  - Single/double digit hours: `1`, `14`, `23`
  - Hours with AM/PM: `10 AM`, `10 PM`, `12 AM`, `12 PM`
  - Standard time formats: `2:30 PM`, `14:30`, `2 PM`
  - Seconds included: `14:30:45`, `2:30:15 PM`
- **Timezone Support**: 
  - Full IANA timezone names (e.g., `America/New_York`, `Europe/London`)
  - Common abbreviations (EST, PST, GMT, UTC, JST, IST, etc.)
  - Automatic daylight saving time handling
- **User Experience**:
  - Current timezone auto-detection and defaulting
  - Visual indicators for user's current timezone
  - Comprehensive error handling with helpful messages
  - Multiple output formats and copy functionality

### Technical
- Built with TypeScript and React
- Uses Raycast API for native integration
- Leverages `date-fns` and `date-fns-tz` for robust timezone calculations
- Supports both 12-hour and 24-hour time formats
- Real-time clock updates for World Clock feature

## [1.0.0] - TBD
### Added
- Initial public release
