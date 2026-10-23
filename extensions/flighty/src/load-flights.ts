import {getApplications} from '@raycast/api'
import {executeSQL} from '@raycast/utils'
import {existsSync} from 'fs'
import {z} from 'zod'
import {FlightSchema, flightDatabasePath, flightQuery} from './flights'

export async function loadFlights() {
    const applications = await getApplications()
    if (!applications.some((app) => app.bundleId === 'com.flightyapp.flighty')) {
        throw new Error('Flighty is not installed. Please install it to look up your flights.')
    }
    if (!existsSync(flightDatabasePath)) {
        throw new Error(
            'Unable to find or access Flighty data. Open Flighty and let your flights sync. If access is blocked, enable Full Disk Access for Raycast in System Settings > Privacy & Security, then quit and reopen Raycast.'
        )
    }

    let rows: unknown[]
    try {
        rows = await executeSQL(flightDatabasePath, flightQuery)
    } catch (error) {
        throw new Error(
            'Unable to read Flighty data. Open Flighty, then enable Full Disk Access for Raycast in System Settings > Privacy & Security. Quit and reopen Raycast, then try again.',
            {cause: error}
        )
    }

    const result = z.array(FlightSchema).safeParse(rows)
    if (!result.success) throw new Error('Unable to parse Flighty data. The database format may have changed. Please report this issue.')
    return result.data
}
