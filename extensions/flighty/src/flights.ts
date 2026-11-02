import {z} from 'zod'
import {homedir} from 'os'

// schema
const TimestampSchema = z.int().positive()

export const FlightSchema = z.object({
    id: z.uuid(),
    number: z.string(),

    // airline
    airlineId: z.uuid(),
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

export const flightDatabasePath = `${homedir()}/Library/Containers/com.flightyapp.flighty/Data/Documents/MainFlightyDatabase.db`
export const flightQuery = `
SELECT
    Flight.id,
    Flight.number,

    Airline.id as airlineId,
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
    UserFlight.importSource IS NOT 'CONNECTED_FRIEND'
    AND
    Ticket.userId IS NOT ''
`
