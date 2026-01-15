# Changelog

All notable changes to the Timestamp Tools extension will be documented in this file.

## [1.0.0] - 2026-01-15

### Added
- **Initial release** with comprehensive timestamp and date utilities
- **Convert Timestamp to Date**: Convert Unix timestamps with auto-detection of seconds/milliseconds
- **Convert Date to Timestamp**: Convert human-readable dates to Unix timestamps
- **Multi-format support**: 5 different date formatting options
- **Timezone support**: 6 common timezones with Shanghai as default
- **Date Difference Calculator**: Calculate differences in years, months, or days
- **Time Operation**: Add/subtract years, months, or days to dates
- **Time Analysis**: Detailed date component analysis (year, quarter, week, day, time)

### Features
- Auto-detection of timestamp format (≤11 digits = seconds, >11 digits = milliseconds)
- Smart date parsing with automatic time component handling
- Copy to clipboard functionality for all results
- User-friendly interface with dropdown selections
- Comprehensive error handling and validation

### Technical
- Built with React and TypeScript
- Uses Raycast API v1.103.0
- Responsive design for both macOS and Windows
- Proper timezone handling with Intl.DateTimeFormat
- Comprehensive input validation

## Future Enhancements
- More date formats and customization options
- Additional timezone support
- Batch conversion capabilities
- Historical timestamp validation
- Integration with system calendar
- More granular time unit calculations
- Internationalization support