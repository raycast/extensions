# Air Quality - IQAir Extension for Raycast

A Raycast extension to check air quality (AQI, PM2.5, PM10 and other pollutants) for cities worldwide using IQAir data.

## Features

- 🌍 **Search any city** - Find air quality data for any city in the IQAir database
- 📊 **Detailed information** - View AQI, air quality level, main pollutant, and individual pollutants
- 🏆 **Top polluted cities** - Browse the most polluted cities ranked by current AQI
- 🎨 **Color-coded levels** - Visual indicators for different air quality levels
- ⚙️ **Default city preference** - Set a default city for quick access

## Commands

### Check Air Quality
Check air quality for any city using IQAir data. You can:
- Search for any city by name
- View detailed AQI information
- See all measured pollutants (PM2.5, PM10, O₃, NO₂, SO₂, CO)
- Set a default city in preferences

**Usage:**
```
iqair [city name]
```

### Top Polluted Cities
View the top 10 most polluted cities ranked by current AQI. Click on any city to see detailed information.

## Installation

1. Clone this repository
2. Open Raycast → Extensions → Import Extension
3. Select this directory
4. The extension will be available in Raycast

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

## Requirements

- Raycast
- Node.js 18+ (for development)

## License

MIT

## Author

IceFinger

