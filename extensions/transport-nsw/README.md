# Transport NSW

Plan trips and view real-time departures for Sydney trains, metro, and light rail directly from Raycast.

## Features

- **Plan Trips**: Search for stations and plan trips with multiple journey options
- **Journey Details**: View full stop-by-stop journey information with platforms and times
- **Favorite Trips**: Save frequently used routes for quick access
- **Menu Bar**: See upcoming departures for your favorite trips at a glance
- **AI Assistant**: Ask natural language questions about trips and delays
- **Real-time Data**: Live departure times with delay information when available

## Setup

This extension requires a free API key from Transport NSW Open Data.

1. Visit [opendata.transport.nsw.gov.au](https://opendata.transport.nsw.gov.au/)
2. Create a free account
3. Go to your Applications and create a new application
4. Add the "Trip Planner APIs" to your application
5. Copy your API key
6. Open Raycast, search for "Transport NSW", and enter your API key in the extension preferences

The free plan provides more than enough API calls for personal use.

## Commands

### Plan Trip

Search for stations and plan a trip between any two locations. Results show:
- Departure and arrival times
- Total journey duration
- Line/service information
- Platform numbers
- Real-time delay indicators

Select a journey to view the full stop-by-stop breakdown.

### Favorite Trips (Menu Bar)

Quick access to upcoming departures for your saved trips directly in the menu bar. Shows the next 3 departures for each of your favorite routes.

## AI Tools

Ask the AI assistant questions like:
- "Plan a trip from Central to Bondi Junction"
- "Are there any delays on the T1 line?"
- "Save this trip to my favorites"
- "What are my saved trips?"

## Keyboard Shortcuts

- `Enter` - View trip / Select station
- `Cmd+Shift+S` - Save or remove trip from favorites
- `Cmd+Backspace` - Delete saved trip

## Data Source

This extension uses the [Transport NSW Open Data APIs](https://opendata.transport.nsw.gov.au/), which provide real-time public transport information for New South Wales, Australia.
