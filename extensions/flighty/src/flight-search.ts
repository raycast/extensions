import {z} from 'zod'
import type {Flight} from './flights'

const dateSchema = z.iso.date()
const searchSchema = z.object({
    query: z.string().optional(),
    departure: z.string().optional(),
    arrival: z.string().optional(),
    fromDate: dateSchema.optional(),
    toDate: dateSchema.optional(),
    period: z.enum(['upcoming', 'past', 'all']).default('all'),
    limit: z.int().min(1).max(100).default(25),
    offset: z.int().min(0).default(0),
})

export type FlightSearch = z.input<typeof searchSchema>

function normalize(value: string) {
    return value.toLowerCase().replace(/\s+/g, '')
}

function localDate(timestamp: number, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(timestamp * 1000)
    const part = (type: string) => parts.find((part) => part.type === type)?.value
    return `${part('year')}-${part('month')}-${part('day')}`
}

function formatTime(timestamp: number | null, timeZone: string) {
    if (timestamp === null) return null
    return {
        iso: new Date(timestamp * 1000).toISOString(),
        local: `${localDate(timestamp, timeZone)} ${new Intl.DateTimeFormat('en-GB', {timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(timestamp * 1000)}`,
    }
}

export function summarizeFlight(flight: Flight) {
    return {
        id: flight.id,
        flightNumber: `${flight.airlineIata} ${flight.number}`,
        airline: flight.airlineName,
        url: `https://live.flighty.app/${flight.id}`,
        departure: {
            airport: flight.depAirportIata,
            city: flight.depCity,
            timeZone: flight.depTz,
            scheduled: formatTime(flight.depTimeOriginal, flight.depTz),
            estimated: formatTime(flight.depTimeEstimated, flight.depTz),
            actual: formatTime(flight.depTimeActual, flight.depTz),
            terminal: flight.depTerminal,
            gate: flight.depGate,
        },
        arrival: {
            airport: flight.arrAirportIata,
            city: flight.arrCity,
            timeZone: flight.arrTz,
            scheduled: formatTime(flight.arrTimeOriginal, flight.arrTz),
            estimated: formatTime(flight.arrTimeEstimated, flight.arrTz),
            actual: formatTime(flight.arrTimeActual, flight.arrTz),
            terminal: flight.arrTerminal,
            gate: flight.arrGate,
        },
    }
}

export function searchFlights(flights: Flight[], input: FlightSearch, now = Date.now() / 1000) {
    const options = searchSchema.parse(input)
    if (options.fromDate && options.toDate && options.fromDate > options.toDate) {
        throw new Error('fromDate must be on or before toDate.')
    }
    const query = normalize(options.query ?? '')
    const departure = normalize(options.departure ?? '')
    const arrival = normalize(options.arrival ?? '')
    const matches = flights
        .filter((flight) => {
            if (options.period === 'upcoming' && flight.depTimeOriginal < now) return false
            if (options.period === 'past' && flight.depTimeOriginal >= now) return false
            if (
                query &&
                ![
                    flight.number,
                    `${flight.airlineIata}${flight.number}`,
                    `${flight.airlineIcao}${flight.number}`,
                    flight.airlineName,
                    flight.depAirportIata,
                    flight.depCity,
                    flight.arrAirportIata,
                    flight.arrCity,
                ].some((value) => normalize(value).includes(query))
            )
                return false
            if (departure && ![flight.depAirportIata, flight.depCity].some((value) => normalize(value).includes(departure))) return false
            if (arrival && ![flight.arrAirportIata, flight.arrCity].some((value) => normalize(value).includes(arrival))) return false
            if (options.fromDate || options.toDate) {
                const date = localDate(flight.depTimeOriginal, flight.depTz)
                if (options.fromDate && date < options.fromDate) return false
                if (options.toDate && date > options.toDate) return false
            }
            return true
        })
        .sort((a, b) => (options.period === 'past' ? b.depTimeOriginal - a.depTimeOriginal : a.depTimeOriginal - b.depTimeOriginal) || a.id.localeCompare(b.id))

    const page = matches.slice(options.offset, options.offset + options.limit)
    return {
        source: 'Flights saved in the local Flighty app; updates depend on Flighty syncing.',
        total: matches.length,
        nextOffset: options.offset + page.length < matches.length ? options.offset + page.length : null,
        flights: page.map(summarizeFlight),
    }
}
