import type {Flight} from './flights'

export function matchesFlightListSearch(flight: Flight, query: string) {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const values = [
        flight.number,
        flight.airlineIata,
        flight.airlineIcao,
        `${flight.airlineIata}${flight.number}`,
        `${flight.airlineIcao}${flight.number}`,
        flight.airlineName,
        flight.depAirportIata,
        flight.depCity,
        flight.arrAirportIata,
        flight.arrCity,
        flight.aircraftIata,
        flight.aircraftIcao,
        flight.aircraftName,
        flight.aircraftTailNumber,
        flight.pnr,
    ]
        .filter((value) => value !== null)
        .map((value) => value.toLowerCase())

    return terms.every((term) => values.some((value) => value.includes(term)))
}
