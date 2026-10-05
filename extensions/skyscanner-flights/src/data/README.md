# Airport Data

This directory contains the airport database used for autocomplete functionality.

## Source

The airport data is from **OpenFlights** ([openflights.org](https://openflights.org/)), a free, open-source database of flight-related information.

- **Data Source**: https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat
- **License**: Open Database License (ODbL)
- **Total Airports**: 6,054 airports with valid IATA codes

## Structure

The `airports.ts` file contains:

- `Airport` interface: Defines the shape of airport data
- `airports` array: Complete list of all airports
- `searchAirportsLocal()` function: Local search functionality

## Airport Data Fields

Each airport has the following properties:

- `iata`: 3-letter IATA airport code (e.g., "JFK", "LAX")
- `name`: Full airport name (e.g., "John F Kennedy International Airport")
- `city`: City name (e.g., "New York")
- `country`: Country name (e.g., "United States")

## Usage

```typescript
import { searchAirportsLocal, Airport } from "./data/airports";

// Search for airports
const results = searchAirportsLocal("New York");
// Returns airports matching "New York" in any field (iata, name, city, country)

// Limited to 50 results for performance
```

## Updating the Data

To regenerate the airport data file:

1. Download the latest data:

   ```bash
   curl "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat" -o airports.dat
   ```

2. Process and regenerate `airports.ts` using the processing script (if needed)

## Search Functionality

The search function filters airports by:

- IATA code (e.g., "JFK")
- Airport name (e.g., "Kennedy")
- City name (e.g., "New York")
- Country name (e.g., "United States")

Search is case-insensitive and returns up to 50 results.
