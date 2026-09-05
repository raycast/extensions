# Flight Status Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Menu bar item showing live flight status and estimated time remaining (e.g. `✈ UA745: Cruising • ~2h 15m`)
- Configurable menu bar icon (Menu Bar Icon preference): the app's phase-aware airplane icon (default; taxi, climb, cruise, descent, landing), the tracked airline's logo, or no icon. The airline logo falls back to the phase icon when the airline is unknown or its logo is unavailable
- Flight phase derived from live telemetry: On Ground, Climbing, Cruising, Descending, Landed
- Detailed dropdown with altitude, ground speed, heading, route, ETA, scheduled arrival in the destination airport's timezone, and gate/terminal/baggage when available
- **Set Flight** and **Clear Flight** commands to start and stop tracking from Raycast
- Live tracking via OpenSky Network with an automatic ADSB.lol fallback (no API key required for either)
- Route resolution via Airlabs (free API key), with a schedules fallback for flights not currently in the live feed
- Optional FlightAware AeroAPI integration for predictive arrival times and diversion/cancellation detection
- "View on FlightRadar24" and "View on FlightAware" links
- Background refresh every 5 minutes plus manual refresh
- Customizable menu bar display: toggle the icon, flight number, status, and ETA independently
