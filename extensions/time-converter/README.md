# Time Converter Raycast Extension

A powerful time zone converter that supports city names, aliases, and flexible time formats.

## Features
- Convert times between multiple timezones
- Support for common city names and timezone aliases
- Flexible time input formats (12/24 hour, now, noon, midnight)
- List or inline output format
- Configurable default locations

## Installation
1. Ensure Node.js 16+ is installed
2. Clone this repository
3. Run `npm install`
4. Run `npm run dev` for development
5. Run `npm run build` for production build

## Usage
1. Open Raycast
2. Type "Convert Time"
3. Enter time (e.g., "3PM", "15:00", "now")
4. Optional: Enter locations (e.g., "NYC, London, Tokyo")
5. Optional: Choose format ("list" or "inline")

## Configuration
Configure default locations and format in Raycast preferences:
1. Open Raycast preferences
2. Navigate to Extensions
3. Find "Time Converter"
4. Set your preferred defaults

## Supported Time Formats
- 12-hour: 3PM, 3:30PM
- 24-hour: 15:00, 15
- Special: now, noon, midnight

## Supported Location Formats
- City names: London, Tokyo, Paris
- Acronyms: NYC, LA, SF
- Timezone IDs: America/New_York, Europe/London

## Development
- `npm run dev`: Start development mode
- `npm run build`: Build for production
- `npm run lint`: Run linter
- `npm run publish`: Publish to Raycast store

## License
MIT