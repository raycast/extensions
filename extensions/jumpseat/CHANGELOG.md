# Changelog

## [Past Flights and In-Flight Progress] - {PR_MERGE_DATE}

- Switch Upcoming Flights to Past to browse the flights you have taken, newest first. Existing connections are asked to reconnect once to allow it.
- While you are airborne, the menu bar counts down to arrival and shows the flight's progress, takeoff time and arrival in your own time zone.
- Show the baggage belt in the menu bar while taxiing in.
- Show the airline's white logo in a dark menu bar, falling back to its dark logo when the airline has no white one.
- Show an airplane icon in the menu bar flight items when an airline logo fails to load.
- Show the airline brand a flight flies under, such as a new name and logo after an announced rebrand, name it in the flight details and the menu bar, and find flights by either name.
- Show each flight number once under its airline code, such as LH 459, even when it is stored with the code attached, and keep a codeshare number under its own airline.
- Find flights by flight number, with or without the airline code: LH 459, LH459 or 459.

## [Dark Airline Logos] - 2026-11-01

- Use dark airline logos in dark appearance, in both the flight lists and the menu bar.

## [Initial Version] - 2026-09-25

- Add an upcoming-flights list and detail view.
- Add a friends' upcoming-flights view with friend, route, timing, status, airport, and aircraft details.
- Show route, flight number, departure countdown, gates, terminals, airports, seat, booking, and aircraft details.
- Add secure browser sign-in with authorization code and PKCE.
- Store and automatically refresh Raycast-scoped Jumpseat credentials.
- Call Jumpseat's authenticated upcoming-flights endpoint directly.
- Support Upcoming Flights on Windows while keeping the menu bar command exclusive to macOS.
