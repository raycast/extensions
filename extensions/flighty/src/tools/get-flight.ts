import {z} from 'zod'
import {loadFlights} from '../load-flights'
import {summarizeFlight} from '../flight-search'

type Input = {
    /** The saved flight UUID returned by search-flights. */
    flightId: string
}

/** Retrieve full details for a saved flight. Null fields are unknown, and data reflects the last Flighty sync. */
export default async function tool(input: Input) {
    const flightId = z.uuid().parse(input.flightId)
    const flight = (await loadFlights()).find((flight) => flight.id.toLowerCase() === flightId.toLowerCase())
    if (!flight) throw new Error('No saved flight found with this ID. Search your flights to find a valid flight ID.')
    return {
        ...summarizeFlight(flight),
        source: 'Local Flighty app; data reflects the last Flighty sync.',
        aircraft: {name: flight.aircraftName, iata: flight.aircraftIata, icao: flight.aircraftIcao, tailNumber: flight.aircraftTailNumber},
        distanceKm: flight.distance,
        baggageBelt: flight.arrBaggageBelt,
        bookingCode: flight.pnr,
        seatNumber: flight.seatNumber,
    }
}
