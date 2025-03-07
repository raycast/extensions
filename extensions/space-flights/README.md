# Space Flights Raycast Extension

A Raycast extension to track upcoming space launches using data from [The Space Devs API](https://ll.thespacedevs.com/docs/).

## Features

- View a list of upcoming rocket launches
- See detailed information about each launch
- Automatic caching to respect API rate limits (15 calls per hour)
- Real-time rate limit monitoring with precise refresh availability timing
- Refresh data manually when needed
- View launch details including:
  - Launch status
  - Launch date and window
  - Mission details
  - Rocket information
  - Launch site details
  - Live stream availability

## Usage

1. Open Raycast
2. Search for "Next Launches"
3. Browse the list of upcoming launches
4. Click on a launch to see detailed information
5. Use the refresh button to update the data (respects rate limits)

## Development

This extension is built with:

- Raycast API
- React
- TypeScript
- The Space Devs API

### API Rate Limiting

The Space Devs API has a rate limit of 15 calls per hour. To respect this limit, the extension implements:

1. **Caching System**: Data is cached with a 1-hour expiration time to minimize API calls
2. **Throttle Information**: The extension checks the `/api-throttle` endpoint to get precise information about rate limits
3. **Smart Refresh Button**: Shows exact timing of when the next refresh will be available
4. **Fallback to Cache**: If rate limited, the extension will automatically use cached data

These features ensure the extension can provide up-to-date information while respecting API limitations.

### Building and Testing

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Credits

Data provided by [The Space Devs API](https://ll.thespacedevs.com/docs/).
