# Airport Codes for Raycast

Offline lookup from an IATA code to an airport, or from an airport name to its IATA code. Also searches cities, countries, ICAO codes, and alternate names supplied by OurAirports.

## Search

Open **Search Airport Codes** in Raycast. No API key or account is required.

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
