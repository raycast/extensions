import {useSQL, type AsyncState} from '@raycast/utils'
import dayjs from 'dayjs'
import fs from 'fs'
import {useInstalled} from './use-installed'
import {parseFlights, flightDatabasePath, flightQuery, type Flight} from './flights'
import type {ReactNode} from 'react'

type FlightState = AsyncState<Flight[]> & {permissionView?: ReactNode; warning?: string}

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

    try {
        const {flights, warning} = parseFlights(response.data)
        return {isLoading: false, data: flights.toSorted((a, b) => b.depTimeOriginal - a.depTimeOriginal), warning}
    } catch (error) {
        return {isLoading: false, error: error instanceof Error ? error : new Error('Unable to parse Flighty data. Please report this issue.')}
    }
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
