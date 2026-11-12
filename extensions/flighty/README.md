# Flighty

View and look up flights saved in the Flighty app.

## AI Tools

Mention `@Flighty` in Raycast AI to ask about your flights:

- "When is my next flight?"
- "Look up my SK 1415 flights."
- "Show my flights from Stockholm to London next month."
- "What's the gate and seat for my next flight?"

**Search Flights** filters saved flights by flight number, airline, departure/arrival airport or city, departure date range, and upcoming/past flights. Results include flight links, airport-local times, terminals, and gates, with pagination for larger histories.

**Get Flight Details** retrieves aircraft, baggage belt, booking code, and seat information using an ID returned by Search Flights.

Flighty must be installed and synced on this Mac. The tools read the same local database as View Flights, so data reflects Flighty's last sync. They cannot search unsaved flights, fares, or seat availability, or book flights. If database access is denied, enable Full Disk Access for Raycast in System Settings.

If a saved flight cannot be parsed, View Flights and the AI tools still show readable flights with a warning that results may be incomplete. The warning identifies invalid fields without including flight or booking values. In View Flights, select the warning and use **Copy Error Details** when reporting the issue. If no flights can be parsed, an error shows the affected fields.

## Development

Run `npm ci`, then `npm run dev` to load the extension in Raycast. Run `npm test` (Node.js 22.18+), `npm run build`, and `npm run lint` to validate changes.
