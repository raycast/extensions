# Timestamp Tools - Raycast Extension

A powerful set of timestamp and date utilities for Raycast, providing seamless conversion between timestamps and human-readable dates with multiple formatting options.

## Features

### 🔄 Timestamp Conversion
- **Convert Timestamp to Date**: Convert Unix timestamps (seconds/milliseconds) to human-readable dates
- **Convert Date to Timestamp**: Convert human-readable dates to Unix timestamps
- **Auto-detection**: Automatically detects timestamp format (seconds vs milliseconds)
- **Multiple Formats**: Support 5 different date formats
- **Timezone Support**: Choose from 6 common timezones (default: Asia/Shanghai)

### 📊 Date Calculations
- **Date Difference Calculator**: Calculate the difference between two dates in years, months, or days
- **Time Operation**: Add/subtract years, months, or days to/from a specified date
- **Time Analysis**: Detailed analysis of date components (year, quarter, week, day, time)

## Usage

### Convert Timestamp to Date
1. Enter Unix timestamp (seconds or milliseconds)
2. Select desired date format
3. Choose timezone
4. View converted result

### Convert Date to Timestamp  
1. Enter date string (e.g., "2026-01-15" or "2026-01-15 14:30:00")
2. Get Unix timestamp result

### Date Difference Calculator
1. Enter start and end dates
2. Select calculation unit (days/months/years)
3. View the difference

### Time Operation
1. Enter base date
2. Specify amount to add/subtract
3. Select time unit (years/months/days)
4. View result date

### Time Analysis
1. Enter any date
2. Get detailed analysis including:
   - Year, quarter, week number
   - Day of year
   - Time components (hour:minute:second)
   - Complete date analysis

## Supported Formats

### Date Formats
- `YYYY-MM-DD HH:mm:ss` - 2026-01-15 14:30:00
- `YYYY/MM/DD HH:mm:ss` - 2026/01/15 14:30:00  
- `MM-DD-YYYY HH:mm:ss` - 01-15-2026 14:30:00
- `MMMM D, YYYY h:mm A` - January 15, 2026 2:30 PM
- `YYYY年MM月DD日 HH时mm分ss秒` - 2026年01月15日 14时30分00秒

### Timezones
- Asia/Shanghai (UTC+8)
- UTC (Coordinated Universal Time)
- America/New_York (UTC-5/-4)
- Europe/London (UTC+0/+1)
- Asia/Tokyo (UTC+9)
- America/Los_Angeles (UTC-8/-7)

## Installation

1. Install the extension from Raycast Store
2. Search for "Timestamp Tools" in Raycast
3. Choose the desired command

## Development

```bash
# Install dependencies
npm install

# Develop locally
npm run dev

# Build for production
npm run build

# Lint code
npm run lint
```

## License

MIT License - see LICENSE file for details