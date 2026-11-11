import {useSQL, type AsyncState} from '@raycast/utils'
import {z} from 'zod'
import dayjs from 'dayjs'
import fs from 'fs'
import {useInstalled} from './use-installed'
import {FlightSchema, flightDatabasePath, flightQuery, type Flight} from './flights'
import type {ReactNode} from 'react'

type FlightState = AsyncState<Flight[]> & {permissionView?: ReactNode}

function useFlightQuery(): FlightState {
    try {
        return useSQL<Flight>(flightDatabasePath, flightQuery, {
            permissionPriming: 'This is required to read flights saved in Flighty.',
        })
    } catch {
        return {isLoading: false, error: new Error('Unable to read Flighty data. Please restart it and try again.')}
    }
}

export function useFlights(): FlightState {
    // hooks
    const installed = useInstalled('com.flightyapp.flighty')
    const response = useFlightQuery()

    // handle install status
    if (installed.isLoading || installed.data === undefined) return {isLoading: true}
    if (!installed.data) return {isLoading: false, error: new Error('Flighty is not installed. Please install it to view your flights.')}

    if (response.permissionView) return response

    // handle database error
    if (!fs.existsSync(flightDatabasePath)) return {isLoading: false, error: new Error('Unable to read Flighty data. Please restart it and try again.')}

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
