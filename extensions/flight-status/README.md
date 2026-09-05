# Flight Status - Raycast Menu Bar Extension

A Raycast menu bar extension that displays real-time flight status and ETA directly in your Mac's menu bar.

## Features

- **Menu bar status**: Shows flight status and estimated time remaining (e.g., `✈ UAL745: Cruising • ~2h 15m`)
- **Configurable menu bar icon**: Choose the app's phase-aware airplane icon (default), the tracked airline's logo, or no icon — via the Menu Bar Icon preference. The airline logo falls back to the phase icon when the airline is unknown
- **Detailed dropdown**: Click for full flight details including altitude, speed, heading, departure/arrival airports, and last updated time
- **Predictive ETA**: Optional FlightAware AeroAPI integration for ML-powered arrival predictions
- **Diversion detection**: Surfaces diverted/cancelled status from FlightAware when available
- **Map links**: Open the flight on FlightRadar24 or FlightAware in your browser
- **Auto-polling**: Updates every 5 minutes with manual refresh on click
- **Smart visibility**: Menu bar item only appears when the flight is actively in the air or taxiing — hides when inactive

## APIs Used

### OpenSky Network (primary — live tracking)

- **Free, no API key required** (anonymous access)
- No monthly request cap (rate-limited to ~1 request/5 seconds)
- Provides: position (lat/lon), altitude, speed, heading, on-ground status, callsign
- Docs: https://openskynetwork.github.io/opensky-api/

### Airlabs (secondary — route info)

- **Free tier**: 1,000 requests/month
- Requires a free API key (sign up at https://airlabs.co/)
- Used once per session to resolve the flight's departure and arrival airports
- Docs: https://airlabs.co/docs/flights

### FlightAware AeroAPI (optional — predictive ETA & status)

- **Paid**: ~$0.05/call, $5/month free credit (a 5-hour flight costs ~$3)
- Requires an API key (sign up at https://flightaware.com/aeroapi/)
- Provides: ML-predicted landing time (`estimated_on`), flight status, diversion detection, gate/terminal/baggage info
- Polled every 5 minutes alongside OpenSky
- Docs: https://flightaware.com/aeroapi/portal/documentation

When configured, FlightAware's `estimated_on` is preferred over the Haversine ETA calculation. The `diverted` boolean flag is used to surface diversion status in the menu bar title — something raw telemetry data alone cannot detect.

## How It Works

1. On launch, calls Airlabs to get departure/arrival airports for the configured flight number
2. Polls OpenSky Network every 5 minutes for live aircraft state (position, altitude, speed, on-ground status)
3. Derives flight phase from telemetry data:
   - **On Ground** — on_ground is true
   - **Climbing** — altitude increasing, airborne
   - **Cruising** — at stable high altitude
   - **Descending** — altitude decreasing from cruise
   - **Landed** — on_ground after previously being airborne
4. Estimates time remaining using great-circle distance from current position to destination airport and current ground speed
5. Hides from menu bar when flight is not found or not currently active

## Preferences

| Preference | Type | Required | Description |
|---|---|---|---|
| Flight Number | Text | Yes | IATA flight number (e.g., `UA745`, `DL123`, `AA100`) |
| Airlabs API Key | Password | Yes | Free API key from https://airlabs.co/ |
| FlightAware API Key | Password | No | AeroAPI key from https://flightaware.com/aeroapi/ for predictive ETA |
| Menu Bar Icon | Dropdown | No | Icon shown in the menu bar: App icon (flight phase, default), Airline logo, or None |

The extension includes a bundled IATA-to-ICAO airline code mapping (e.g., `UA` → `UAL`, `DL` → `DAL`) to convert user-friendly flight numbers into the ICAO callsign format used by OpenSky.

## Flight Status Derivation

Since OpenSky provides raw telemetry (not semantic status), flight phase is derived:

| Condition | Status |
|---|---|
| `on_ground == true` and no prior airborne state | **Taxiing / On Ground** |
| `on_ground == false` and altitude increasing | **Climbing** |
| `on_ground == false` and altitude stable (> 20,000 ft) | **Cruising** |
| `on_ground == false` and altitude decreasing | **Descending** |
| `on_ground == true` and was previously airborne | **Landed** |
| Flight not found in OpenSky data | **Not Active** (hides from menu bar) |

## ETA Calculation

ETA uses a priority-based approach:

1. **FlightAware `estimated_on`** (if configured) — ML-predicted landing time, updated every poll
2. **Haversine fallback** — great-circle distance from current position to destination ÷ ground speed, using a two-phase model (cruise + approach deceleration)

The Haversine calculation accounts for approach slowdown by modeling the last ~80 nm at reduced speed plus final approach time.

## Menu Bar Display

**Menu bar text** (always visible):
```
✈ UA745: Cruising • ~2h 15m
```

**Dropdown** (on click):
- Flight: UA745
- Status: Cruising
- Altitude: 35,000 ft
- Speed: 470 kts
- Heading: 267°
- Route: SFO → EWR
- ETA: ~2h 15m
- FA Status: En Route / On Time (when FlightAware configured)
- Progress: 62% (when FlightAware configured)
- Arr Terminal: B
- Arr Gate: B14
- Last Updated: 2:45 PM
- [Refresh]
- [View on FlightRadar24]
- [View on FlightAware]

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Tech Stack

- [Raycast API](https://developers.raycast.com/) — menu bar extension framework
- [OpenSky Network API](https://openskynetwork.github.io/opensky-api/) — live flight tracking
- [Airlabs API](https://airlabs.co/) — flight route information
- [FlightAware AeroAPI](https://flightaware.com/aeroapi/) — predictive ETA and flight status (optional)
- TypeScript
