# Flight Status — Raycast Menu Bar Extension

## Project Overview

A Raycast menu bar extension that shows real-time flight status and ETA in the macOS menu bar. Uses OpenSky Network for live tracking and Airlabs for route resolution.

## Architecture

### APIs

- **OpenSky Network** — Free, no API key. Provides live aircraft state vectors (position, altitude, speed, heading, on_ground). Polled every 5 minutes + manual refresh. Rate limit: ~1 req/5s anonymous.
  - Endpoint: `GET https://opensky-network.org/api/states/all`
  - Filter by callsign (ICAO format, e.g., `UAL745`)

- **Airlabs** — Free tier (1,000 req/month), requires API key. Used once per session to get departure/arrival airports for the flight.
  - Endpoint: `GET https://airlabs.co/api/v9/flights?flight_icao={callsign}&api_key={key}`

### Extension Type

This is a **Raycast menu bar command** (not a regular command). It uses `MenuBarExtra` from the Raycast API.

### Key Data Flow

1. User configures flight number (IATA format, e.g., `UA745`) + Airlabs API key in preferences
2. Extension converts IATA flight number to ICAO callsign using bundled mapping (`UA` → `UAL`)
3. On first load, call Airlabs to get departure airport, arrival airport, and their coordinates
4. Poll OpenSky every 5 minutes for live state vector filtered by callsign
5. Derive flight phase from telemetry (on_ground, altitude changes)
6. Estimate ETA from great-circle distance to destination ÷ ground speed
7. Display in menu bar: `✈ UA745: Cruising • ~2h 15m`
8. Clicking menu bar shows dropdown with full details + FlightRadar24 link + refresh button
9. Hide menu bar item entirely when flight is not active / not found

### Flight Phase Derivation

OpenSky does NOT provide semantic flight status. Derive it:
- `on_ground == true` → Taxiing / On Ground
- Airborne + altitude increasing → Climbing
- Airborne + altitude stable (> 20,000 ft) → Cruising
- Airborne + altitude decreasing → Descending
- `on_ground == true` after being airborne → Landed
- Not found in OpenSky → hide from menu bar

Track previous altitude readings to detect phase transitions. Store last N altitude samples (e.g., last 3) to determine trend.

### IATA to ICAO Airline Code Mapping

Bundle a static mapping object for common airlines. The user enters IATA codes (UA, DL, AA) and the extension converts to ICAO (UAL, DAL, AAL) for OpenSky queries.

Example: `{ "UA": "UAL", "DL": "DAL", "AA": "AAL", "SW": "SWA", "B6": "JBU", ... }`

Include at minimum the major US and international carriers. The mapping file should be in `src/data/airline-codes.ts`.

### ETA Calculation

Use the Haversine formula:
1. Get current aircraft lat/lon from OpenSky
2. Get destination airport lat/lon from Airlabs route response
3. Calculate great-circle distance in nautical miles
4. Divide by ground speed (from OpenSky, in m/s — convert to knots)
5. Format as `~Xh Ym`

### Preferences (Raycast extension preferences)

| Name | Type | Required | Description |
|---|---|---|---|
| `flightNumber` | `textfield` | Yes | IATA flight number (e.g., `UA745`) |
| `airlabsApiKey` | `password` | Yes | Airlabs API key |

### Menu Bar Dropdown Items

When the user clicks the menu bar item, show:
1. Flight number and full status
2. Altitude (formatted in feet)
3. Ground speed (formatted in knots)
4. Heading (formatted in degrees)
5. Route (e.g., SFO → EWR)
6. Estimated time remaining
7. Last updated timestamp
8. Separator
9. Refresh action
10. "View on FlightRadar24" action — opens `https://www.flightradar24.com/{callsign}` in browser

## File Structure

```
flight-status/
├── src/
│   ├── flight-status.tsx          # Main menu bar command entry point
│   ├── api/
│   │   ├── opensky.ts             # OpenSky Network API client
│   │   └── airlabs.ts             # Airlabs API client
│   ├── data/
│   │   └── airline-codes.ts       # IATA → ICAO airline code mapping
│   ├── utils/
│   │   ├── flight-phase.ts        # Flight phase derivation logic
│   │   ├── eta.ts                 # ETA calculation (Haversine + speed)
│   │   └── format.ts              # Formatting helpers (altitude, speed, heading, time)
│   └── types.ts                   # TypeScript type definitions
├── assets/
│   └── command-icon.png           # Menu bar icon
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── README.md
```

## Coding Conventions

- TypeScript strict mode
- Use Raycast's built-in hooks: `useCachedState`, `useInterval` from `@raycast/utils`
- Use `fetch` for HTTP requests (built into Raycast's Node runtime)
- No external dependencies beyond `@raycast/api` and `@raycast/utils`
- Format numbers with locale-aware formatting where appropriate
- All API responses should be typed with TypeScript interfaces

## Test Flight

For development/testing, use: **UAL745** (United Airlines flight 745)

## Important Notes

- OpenSky anonymous access has no monthly cap but is rate-limited (~5s between requests). Don't poll more frequently than every 30 seconds.
- The 5-minute poll interval is the default. Manual refresh (clicking menu bar) should trigger an immediate poll.
- When the flight is not found in OpenSky data, return `null` and hide the menu bar item.
- Airlabs free tier is 1,000 requests/month. Since we only call it once per session, this is more than enough.
- Altitude from OpenSky is in meters — convert to feet for display.
- Speed from OpenSky is in m/s — convert to knots for display.
- Heading from OpenSky is in degrees (0-360).

## Development Conventions

- Do not use inline scripts in bash commands. If a script is needed, write it to the `.temp/` folder (gitignored) and execute it from there using `mise` or `uv`.

## SDLC

### Commit Rules (MANDATORY)

After completing any unit of work (feature, fix, refactor, etc.), you MUST:

1. **Commit immediately** — do not wait for the user to ask. Use a background subagent for git operations.
2. **Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)** — prefix with `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, etc.
3. **Keep commits small and focused** — one logical change per commit.

### Post-Commit (MANDATORY)

After every commit, you MUST do both of these using background subagents:

1. **Update `CHANGELOG.md`** — follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/). Create the file if it doesn't exist.
2. **Update `TODO.md`** — mark completed tasks as done, add new tasks discovered during work. Create the file if it doesn't exist.

### Versioning

- Use [Semantic Versioning](https://semver.org/)
