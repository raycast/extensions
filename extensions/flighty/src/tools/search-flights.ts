import {loadFlights} from '../load-flights'
import {searchFlights} from '../flight-search'

type Input = {
    /** Flight number (such as SK 1415 or SAS1415), airline name, airport code, or city. Omit to list flights. */
    query?: string
    /** Departure airport IATA code or city, such as ARN or Stockholm. */
    departure?: string
    /** Arrival airport IATA code or city, such as LHR or London. */
    arrival?: string
    /** Inclusive first departure date in YYYY-MM-DD, in each departure airport's local time zone. */
    fromDate?: string
    /** Inclusive last departure date in YYYY-MM-DD, in each departure airport's local time zone. */
    toDate?: string
    /** Defaults to all. Use upcoming for the next flights, past for flight history. Based on scheduled departure. Upcoming/all are earliest first; past is latest first. */
    period?: 'upcoming' | 'past' | 'all'
    /** Number of flights to return, 1–100. Defaults to 25. */
    limit?: number
    /** Pagination offset, starting at 0. Use nextOffset from the previous result for more matches. */
    offset?: number
}

/** Search flights already saved in the user's Flighty app. This does not search airline schedules, ticket prices, or unsaved flights. */
export default async function tool(input: Input) {
    return searchFlights(await loadFlights(), input)
}
