# Lunar Date

Convert between Chinese lunar dates and solar dates with zodiac information.

## Features

- **Bidirectional Conversion**: Convert solar dates to lunar dates and vice versa
- **Multiple Input Formats**: Supports YYYY-MM-DD, yyyyMMdd, MM/DD/YYYY, YYYY/MM/DD, YYYY.MM.DD
- **Chinese Date Support**: Accepts traditional Chinese lunar date formats (农历2024年正月初八, 正月初八)
- **Auto-Detection**: Automatically detects date format and conversion direction
- **Zodiac Information**: Displays Chinese zodiac animal for the converted date
- **Large Display**: Eye-catching results with Detail view for better readability
- **Quick Actions**: Copy results to clipboard with keyboard shortcuts

## Usage

1. Open Raycast and type "Convert Lunar Date"
2. Enter a date in any supported format:
   - Solar: `2024-01-15`, `20240115`, `01/15/2024`
   - Lunar: `农历2024年正月初八`, `正月初八`, `2024年正月初八`
3. The extension automatically detects the format and shows the conversion
4. Use Cmd+C to copy the result or "Back to Input" to convert another date

## Examples

- `2024-01-15` → `农历2023年腊月初五`
- `20240215` → `农历2024年正月初六`
- `农历2024年正月初八` → `公历2024年2月17日 (2024-02-17)`
- `正月初八` → Converts using current year

## Supported Date Range

- Solar dates: 1900-2100
- Lunar dates: 1900-2100

The extension uses the `lunar-typescript` library for accurate lunar calendar calculations.