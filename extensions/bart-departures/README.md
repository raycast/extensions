# BART Departures

View real-time BART departures for a selected station in Raycast.

## Raycast App

https://www.raycast.com/unknowndate/bart-departures

## Local setup

1. Run `npm install`.
2. Run `npm run dev` and open **BART Departures** in Raycast.

## API key

The extension includes a public BART API token, so no Raycast preference or user setup is required. The token is intentionally easy to rotate.

If you are maintaining a fork and want to use a different token, change the `BART_API_KEY` constant in `src/bart-api.ts`. You can request a key from the [BART developer API page](https://www.bart.gov/schedules/developers/api).
