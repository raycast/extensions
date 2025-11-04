# Skyscanner Flight Search

A Raycast extension to quickly search for flights on Skyscanner using natural language or a manual form.

## Features

- 🤖 **AI-Powered Natural Language Search**: Describe your flight in plain English (requires Raycast Pro)
- 📝 **Fallback Manual Form**: Incase your query is faulty then you can continue with smart airport search form
- ✈️ **6,000+ Airports**: Search worldwide airports by name, city, or IATA code
- 🌐 **Direct Browser Launch**: Opens your search directly on Skyscanner.com
- 🚀 **Fast & Offline**: Airport database works without internet connection
- 🎯 **One-way & Round-trip**: Automatically detected from your query
- 🛑 **Stops Filter**: Choose direct flights, flights with stops, or any

## Usage

### AI-Powered Search (Raycast Pro)

1. Open Raycast (Cmd+Space)
2. Type "Search Flights"
3. Describe your flight in natural language:
   - "New York to London tomorrow"
   - "Direct flight from Mumbai to Dubai next Monday for 2 adults"
   - "JFK to LAX returning Friday"
4. Press Enter - AI parses your query and opens Skyscanner

### Manual Form (Fallback)

If AI parsing fails or you don't have Raycast Pro, use the manual form:

1. **Origin Airport**: Type to search (e.g., "Mumbai", "BOM")
2. **Destination Airport**: Type to search (e.g., "New York", "JFK")
3. **Departure Date**: Select your departure date
4. **Return Date** (Optional): For round-trip flights
5. **Number of Adults**: 1-8 passengers
6. **Stops**: Any, direct only, or with stops
7. Press Enter to open Skyscanner

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
