import {useSQL, type AsyncState} from '@raycast/utils'
import {z} from 'zod'
import {homedir} from 'os'
import dayjs from 'dayjs'
import fs from 'fs'
import {useInstalled} from './use-installed'

// schema
const TimestampSchema = z.number().int().positive()

const FlightSchema = z.object({
    id: z.string().uuid(),
    number: z.string(),

    // airline
    airlineIata: z.string().length(2),
    airlineIcao: z.string().length(3),
    airlineName: z.string(),

    // airports
    depAirportIata: z.string().length(3),
    depCity: z.string(),
    arrAirportIata: z.string().length(3),
    arrCity: z.string(),

    // aircraft
    aircraftIata: z.string().length(3).nullable(),
    aircraftIcao: z.string().length(4).nullable(),
    aircraftName: z.string().nullable(),
    aircraftTailNumber: z.string().nullable(),

    // details
    distance: z.number(),

    depTz: z.string(),
    depTimeOriginal: TimestampSchema,
    depTimeEstimated: TimestampSchema.nullable(),
    depTimeActual: TimestampSchema.nullable(),
    depTerminal: z.string().nullable(),
    depGate: z.string().nullable(),

    arrTz: z.string(),
    arrTimeOriginal: TimestampSchema.nullable(),
    arrTimeEstimated: TimestampSchema.nullable(),
    arrTimeActual: TimestampSchema.nullable(),
    arrTerminal: z.string().nullable(),
    arrGate: z.string().nullable(),

    arrBaggageBelt: z.string().nullable(),

    pnr: z.string().nullable(),
    seatNumber: z.string().nullable(),
})

export type Flight = z.infer<typeof FlightSchema>

const path = `${homedir()}/Library/Containers/com.flightyapp.flighty/Data/Documents/MainFlightyDatabase.db`
const query = `
SELECT
    Flight.id,
    Flight.number,

    Airline.iata as airlineIata,
    Airline.icao as airlineIcao,
    Airline.name as airlineName,

    AirportDep.iata as depAirportIata,
    AirportDep.city as depCity,
    AirportArr.iata as arrAirportIata,
    AirportArr.city as arrCity,

    Flight.equipmentIata as aircraftIata,
    Flight.equipmentIcao as aircraftIcao,
    Flight.equipmentModelName as aircraftName,
    Flight.equipmentTailNumber as aircraftTailNumber,

    Flight.distance,

    AirportDep.timezoneIdentifier as depTz,
    Flight.departureScheduleGateOriginal as depTimeOriginal,
    Flight.departureScheduleGateEstimated as depTimeEstimated,
    Flight.departureScheduleGateActual as depTimeActual,
    Flight.departureTerminal as depTerminal,
    Flight.departureGate as depGate,

    AirportArr.timezoneIdentifier as arrTz,
    Flight.arrivalScheduleGateOriginal as arrTimeOriginal,
    Flight.arrivalScheduleGateEstimated as arrTimeEstimated,
    Flight.arrivalScheduleGateActual as arrTimeActual,
    Flight.arrivalTerminal as arrTerminal,
    Flight.arrivalGate as arrGate,

    Flight.arrivalBaggageBelt as arrBaggageBelt,

    Ticket.pnr as pnr,
    Ticket.seatNumber as seatNumber
FROM
    UserFlight
JOIN
    Airline ON Airline.id = Flight.airlineId,
    Airport as AirportDep on AirportDep.id = Flight.departureAirportId,
    Airport as AirportArr on AirportArr.id = Flight.scheduledarrivalAirportId,
    Flight ON Flight.id = UserFlight.flightId
LEFT JOIN
    Ticket ON Ticket.flightId = Flight.id
WHERE
    Flight.deleted IS NULL
    AND
    UserFlight.deleted IS NULL
    AND
    UserFlight.isMyFlight = 1
    AND
    UserFlight.isRandom = 0
    AND
    UserFlight.importSource IS NOT "CONNECTED_FRIEND"
    AND
    Ticket.userId IS NOT ""
`

function useFlightQuery(): AsyncState<Flight[]> {
    try {
        return useSQL<Flight>(path, query)
    } catch (error) {
        return {isLoading: false, error: new Error('Unable to read Flighty data. Please restart it and try again.')}
    }
}

export function useFlights(): AsyncState<Flight[]> {
    // hooks
    const installed = useInstalled('com.flightyapp.flighty')
    const response = useFlightQuery()

    // handle install status
    if (installed.isLoading || installed.data === undefined) return {isLoading: true}
    if (!installed.data) return {isLoading: false, error: new Error('Flighty is not installed. Please install it to view your flights.')}

    // handle database error
    if (!fs.existsSync(path)) return {isLoading: false, error: new Error('Unable to read Flighty data. Please restart it and try again.')}

    // load state
    if (response.data === undefined) return response

    // validate data
    const {success, error, data} = z.array(FlightSchema).safeParse(response.data)

    // handle invalid data
    if (!success) {
        console.error(error)
        return {isLoading: false, error: new Error('Parse error. Please report this issue.')}
    }

    // return valid data
    return {isLoading: false, data: data.toSorted((a, b) => b.depTimeOriginal - a.depTimeOriginal)}
}

export function getAllYears(allFlights: Flight[] | undefined): number[] | undefined {
    if (!allFlights) return undefined

    const currentDate = dayjs()
    const uniqueYears = new Set<number>()

    for (const flight of allFlights) {
        const date = dayjs.unix(flight.depTimeOriginal)
        if (date.isBefore(currentDate)) uniqueYears.add(date.year())
    }

    return Array.from(uniqueYears).toSorted((a, b) => b - a)
}
