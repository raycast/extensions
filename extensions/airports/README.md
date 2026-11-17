# Airport Codes for Raycast

Offline lookup from an IATA code to an airport, or from an airport name to its IATA code. Also searches cities, countries, ICAO codes, and alternate names supplied by OurAirports.

## Install locally

Requires macOS, Raycast, Node.js 24 or newer, and npm.

```sh
npm install
npm run dev
```

Raycast imports the development extension. Open **Search Airport Codes** in Raycast. No API key, account, or network connection is needed for searches.

## Search

- `LHR` → London Heathrow Airport.
- `John F. Kennedy` → JFK first.
- `Frankfurt Main` → FRA.
- `Munchen` or `München` → Munich Airport (MUC), using its alternate names.
- `London` → matching airports around London.

Search ignores case, accents, and punctuation. Multiple words must all match, in any order. Exact IATA matches rank first; equally relevant airport-name matches favor larger airports. An empty search lists the full bundle alphabetically by IATA code, loading more rows as you scroll.

**Enter** copies the selected IATA code. The action panel also offers **Copy Airport Name**, **Copy Airport Details** (⌘⇧C), and **View on OurAirports**. Only opening the source website requires a network connection.

## Airport data

The bundled snapshot contains **9,053 airport records**, downloaded on **2026-11-17**, from the [OurAirports open-data repository](https://github.com/davidmegginson/ourairports-data). It includes every record with a three-letter uppercase IATA code, including smaller airports, heliports, and seaplane bases. Airports without an IATA code and standalone metropolitan/railway codes are not included. Records are keyed by the source identifier, not by IATA code, so duplicate code assignments are not silently discarded. Closed facilities, if present in a future snapshot, are labeled.

OurAirports is community-maintained, not an official IATA registry; completeness and accuracy are not guaranteed. Its data is [released to the public domain](https://ourairports.com/data/), without a guarantee of accuracy or fitness for use. Not affiliated with OurAirports or IATA. Extension source code is MIT-licensed separately.

To refresh the bundled data (requires Python 3 and internet access):

```sh
npm run update-data
```

The updater downloads airport and country data directly from OurAirports' GitHub repository, retaining names and aliases. Updated data ships with the next extension build; searches never download it at runtime. Update the snapshot count/date above after refreshing.

## Development checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Tests exercise code lookup, name lookup, accented aliases, multi-word queries, ICAO lookup, and empty results against the actual bundled dataset. `npm run lint` runs Raycast's Store metadata, icon, ESLint, and Prettier validation. The npm lockfile keeps local installs and Raycast's publishing CI consistent.
