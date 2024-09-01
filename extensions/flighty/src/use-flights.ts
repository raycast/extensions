import {useSQL, type AsyncState} from '@raycast/utils'
import {z} from 'zod'
import {homedir} from 'os'
import fs from 'fs'

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

    arrTz: z.string(),
    arrTimeOriginal: TimestampSchema.nullable(),
    arrTimeEstimated: TimestampSchema.nullable(),
    arrTimeActual: TimestampSchema.nullable(),
})

type Flight = z.infer<typeof FlightSchema>

export function useFlights(): AsyncState<Flight[]> {
    const path = `${homedir()}/Library/Containers/com.flightyapp.flighty/Data/Documents/MainFlightyDatabase.db`
    if (!fs.existsSync(path))
        return {
            isLoading: false,
            error: new Error('Flighty database not found'),
        }

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

        AirportArr.timezoneIdentifier as arrTz,
        Flight.arrivalScheduleGateOriginal as arrTimeOriginal,
        Flight.arrivalScheduleGateEstimated as arrTimeEstimated,
        Flight.arrivalScheduleGateActual as arrTimeActual
    FROM
        UserFlight
    JOIN
        Airline ON Airline.id = Flight.airlineId,
        Airport as AirportDep on AirportDep.id = Flight.departureAirportId,
        Airport as AirportArr on AirportArr.id = Flight.scheduledarrivalAirportId,
        Flight ON Flight.id = UserFlight.flightId
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
    `

    const response = useSQL<Flight>(path, query)

    // load state
    if (response.data === undefined) return response

    // validate data
    const {success, error, data} = z.array(FlightSchema).safeParse(response.data)

    // handle invalid data
    if (!success) {
        console.error(error)
        return {isLoading: false, error: new Error('Parse error')}
    }

    // return valid data
    return {isLoading: false, data: data.toSorted((a, b) => b.depTimeOriginal - a.depTimeOriginal)}
}
