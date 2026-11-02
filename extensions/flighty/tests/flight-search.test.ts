import {test} from 'node:test'
import assert from 'node:assert/strict'
import {searchFlights, summarizeFlight} from '../src/flight-search.ts'
import type {Flight} from '../src/flights.ts'

const flight: Flight = {
    id: 'a8e4d3fc-1e6c-47a2-92ec-2dbf476d20f1',
    number: '1415',
    airlineId: 'bb816a5a-6784-4b4b-a3c8-d174088f6e9c',
    airlineIata: 'SK',
    airlineIcao: 'SAS',
    airlineName: 'Scandinavian Airlines',
    depAirportIata: 'ARN',
    depCity: 'Stockholm',
    arrAirportIata: 'LHR',
    arrCity: 'London',
    aircraftIata: null,
    aircraftIcao: null,
    aircraftName: null,
    aircraftTailNumber: null,
    distance: 1460,
    depTz: 'Europe/Stockholm',
    depTimeOriginal: Date.parse('2026-10-23T22:30:00Z') / 1000,
    depTimeEstimated: null,
    depTimeActual: null,
    depTerminal: '5',
    depGate: null,
    arrTz: 'Europe/London',
    arrTimeOriginal: null,
    arrTimeEstimated: null,
    arrTimeActual: null,
    arrTerminal: null,
    arrGate: null,
    arrBaggageBelt: null,
    pnr: 'PRIVATE',
    seatNumber: '12A',
}

test('matches flight numbers with spaces, case, and either airline code', () => {
    for (const query of ['SK1415', 'sk 1415', 'SAS 1415', '1415', 'Scandinavian']) {
        assert.equal(searchFlights([flight], {query}).total, 1)
    }
    assert.equal(searchFlights([flight], {query: "' OR 1=1 --"}).total, 0)
})

test('combines directional route filters', () => {
    assert.equal(searchFlights([flight], {departure: 'arn', arrival: 'London'}).total, 1)
    assert.equal(searchFlights([flight], {departure: 'London', arrival: 'arn'}).total, 0)
})

test('date boundaries use departure airport local time instead of UTC', () => {
    assert.equal(searchFlights([flight], {fromDate: '2026-10-24', toDate: '2026-10-24'}).total, 1)
    assert.equal(searchFlights([flight], {toDate: '2026-10-23'}).total, 0)
    assert.equal(searchFlights([flight], {fromDate: '2026-10-25'}).total, 0)
})

test('local dates remain correct across daylight saving changes', () => {
    const winter = {...flight, depTimeOriginal: Date.parse('2026-10-25T23:30:00Z') / 1000}
    assert.equal(searchFlights([winter], {fromDate: '2026-10-26', toDate: '2026-10-26'}).total, 1)
    const west = {...flight, depTz: 'America/Los_Angeles', depTimeOriginal: Date.parse('2026-10-24T02:00:00Z') / 1000}
    assert.equal(searchFlights([west], {fromDate: '2026-10-23', toDate: '2026-10-23'}).total, 1)
})

test('period filtering, chronological order, and pagination retain total matches', () => {
    const flights = [2, 0, 1].map((offset) => ({...flight, id: String(offset), depTimeOriginal: flight.depTimeOriginal + offset * 3600}))
    const first = searchFlights(flights, {period: 'upcoming', limit: 1}, flight.depTimeOriginal)
    assert.equal(first.total, 3)
    assert.equal(first.flights[0].id, '0')
    assert.equal(first.nextOffset, 1)
    const last = searchFlights(flights, {period: 'upcoming', offset: 2, limit: 1}, flight.depTimeOriginal)
    assert.equal(last.flights[0].id, '2')
    assert.equal(last.nextOffset, null)
    assert.deepEqual(
        searchFlights(flights, {period: 'past'}, flight.depTimeOriginal + 7200).flights.map((flight) => flight.id),
        ['1', '0']
    )
    assert.equal(searchFlights([], {}).total, 0)
    assert.equal(searchFlights(flights, {offset: 10}).nextOffset, null)
})

test('rejects invalid dates, reversed ranges, and invalid pagination', () => {
    for (const input of [{fromDate: '2026-02-30'}, {fromDate: 'tomorrow'}, {fromDate: '2026-10-25', toDate: '2026-10-24'}, {limit: 0}, {limit: 101}, {offset: -1}, {offset: 1.5}]) {
        assert.throws(() => searchFlights([flight], input))
    }
})

test('output distinguishes unknown times and excludes booking details from search', () => {
    const result = summarizeFlight(flight)
    assert.equal(result.departure.scheduled?.iso, '2026-10-23T22:30:00.000Z')
    assert.equal(result.departure.scheduled?.local, '2026-10-24 00:30')
    assert.equal(result.arrival.scheduled, null)
    assert.equal(result.departure.estimated, null)
    assert.equal(result.departure.actual, null)
    assert.ok(!JSON.stringify(result).includes('PRIVATE'))
})
