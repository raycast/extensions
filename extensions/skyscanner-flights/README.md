# Skyscanner Flight Search

A Raycast extension to quickly search for flights on Skyscanner.

## Features

- 🔍 **Search Flights**: Search for flights with intuitive airport selection
- ✈️ **Airport Autocomplete**: Search from 6,000+ airports worldwide by name, city, or IATA code
- 🌐 **Direct Browser Launch**: Opens your search directly on Skyscanner.com
- 🚀 **Fast & Offline**: Airport database works without internet connection
- 🎯 **One-way & Round-trip**: Support for both trip types

## Usage

1. Open Raycast (Cmd+Space)
2. Type "Search Flights"
3. Fill in your flight details:
   - **Origin Airport**: Start typing airport name, city, or code (e.g., "JFK", "New York")
   - **Destination Airport**: Same as origin
   - **Trip Type**: One-way or Round-trip
   - **Departure Date**: Select your departure date
   - **Return Date**: For round-trip flights
   - **Number of Adults**: 1-8 passengers
4. Press Enter to open Skyscanner in your browser with your search pre-filled

## Airport Search

The extension includes a comprehensive database of 6,054 airports worldwide. Search by:
- **IATA Code**: JFK, LAX, LHR
- **Airport Name**: Kennedy, Heathrow, Changi
- **City Name**: New York, London, Tokyo
- **Country Name**: United States, Japan, Singapore

Example results:
```
John F Kennedy International Airport (JFK) - New York, United States
Los Angeles International Airport (LAX) - Los Angeles, United States
London Heathrow Airport (LHR) - London, United Kingdom
```

## Development

### Prerequisites

- Node.js 16+
- Raycast app installed

### Setup

```bash
npm install
npm run dev
```

### Build

```bash
npm run build
```

## Data Sources

Airport data sourced from [OpenFlights](https://openflights.org/) under the Open Database License (ODbL).

## License

MIT License - see LICENSE file for details

## Author

[ayushtom](https://github.com/ayushtom)
