# EZ Timezone Converter

A Raycast extension for easy timezone conversion and world clock functionality.

## Features

### 🌍 Convert Timezone
Interactive form-based timezone conversion with:
- Multiple time input formats (2:30 PM, 14:30, 2 PM, etc.)
- Date picker for specific dates
- Common timezone dropdown selections
- Real-time conversion results

### 🕐 World Clock
Live world clock showing current time in major cities:
- Real-time updates every second
- Major cities across different continents
- Copy time or timezone information
- UTC offset display

### ⚡ Quick Convert
Fast command-line style conversion:
- No UI - instant conversion via arguments
- Supports timezone abbreviations (EST, PST, GMT, etc.)
- Automatically copies result to clipboard
- Shows result in HUD notification

## Usage

### Convert Timezone Command
1. Open Raycast
2. Type "Convert Timezone"
3. Fill in the form with time, date, and timezones
4. Press Enter to convert
5. Copy result if needed

### World Clock Command
1. Open Raycast
2. Type "World Clock"
3. View live times for major cities
4. Use actions to copy time or timezone info

### Quick Convert Command
1. Open Raycast
2. Type "Quick Convert"
3. Enter: `[time] [from_timezone] [to_timezone]`
4. Example: `2:30 PM EST PST`
5. Result automatically copied to clipboard

## Supported Timezone Formats

- **Full IANA names**: `America/New_York`, `Europe/London`, `Asia/Tokyo`
- **Common abbreviations**: `EST`, `PST`, `GMT`, `UTC`, `JST`, `IST`
- **Auto-detection**: The extension handles both standard and daylight saving time

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build extension
npm run build

# Lint code
npm run lint
```

## Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run dev`
4. Import the extension in Raycast

## License

MIT
