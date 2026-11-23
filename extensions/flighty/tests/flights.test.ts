import {test} from 'node:test'
import assert from 'node:assert/strict'
import {formatAirport, parseFlights} from '../src/flights.ts'
import {searchFlights, summarizeFlight} from '../src/flight-search.ts'
import {matchesFlightListSearch} from '../src/flight-list-search.ts'
import {flight} from './fixtures/flight.ts'

test('returns valid flights and empty databases without warnings', () => {
    assert.deepEqual(parseFlights([flight]), {flights: [flight], skippedFlights: 0, warning: undefined})
    assert.deepEqual(parseFlights([]), {flights: [], skippedFlights: 0, warning: undefined})
})

test('one invalid row does not block valid flights or their AI results', () => {
    const later = {...flight, id: 'e1a061f6-bf75-42b9-9b93-e6c86c9321ec', depTimeOriginal: flight.depTimeOriginal + 3600}
    const result = parseFlights([{...flight, aircraftIcao: 'INVALID'}, flight, {...flight, depTimeOriginal: null}, later])
    assert.deepEqual(result.flights, [flight, later])
    assert.equal(result.skippedFlights, 2)
    assert.match(result.warning!, /2 saved flights could not be loaded/)
    assert.match(result.warning!, /aircraftIcao \(too_big\)/)
    assert.match(result.warning!, /depTimeOriginal \(invalid_type\)/)
    const search = searchFlights(result.flights, {limit: 1})
    assert.equal(search.total, 2)
    assert.equal(search.nextOffset, 1)
    assert.equal(search.flights[0].id, flight.id)
    assert.equal(summarizeFlight(result.flights[1]).id, later.id)
})

test('all-invalid data throws field diagnostics instead of appearing to be an empty database', () => {
    assert.throws(() => parseFlights([{...flight, airlineIata: null}]), /1 saved flight could not be loaded.*airlineIata \(invalid_type\)/)
    assert.throws(() => parseFlights([null, 123]), /2 saved flights could not be loaded.*flight \(invalid_type\)/)
    for (const value of [null, undefined, {}, 'invalid']) {
        assert.throws(() => parseFlights(value), /expected a list of flights/)
    }
})

test('diagnostics contain schema fields and codes without exposing flight or booking values', () => {
    const invalid = {...flight, number: {secret: 'PRIVATE-NUMBER'}, pnr: {secret: 'PRIVATE-BOOKING'}, seatNumber: ['PRIVATE-SEAT']}
    const {warning} = parseFlights([flight, invalid, invalid])
    assert.match(warning!, /number \(invalid_type\)/)
    assert.match(warning!, /pnr \(invalid_type\)/)
    assert.match(warning!, /seatNumber \(invalid_type\)/)
    assert.equal(warning!.split('pnr').length - 1, 1)
    assert.ok(!warning!.includes('PRIVATE'))
    assert.ok(!warning!.includes(flight.id))
    assert.ok(!warning!.includes('secret'))
    assert.throws(
        () => parseFlights([invalid]),
        (error: Error) => {
            assert.ok(!error.message.includes('PRIVATE'))
            return true
        }
    )
})

test('limits field diagnostics for widespread format changes', () => {
    const {warning} = parseFlights([flight, {}])
    assert.equal(warning!.match(/\(invalid_type\)/g)?.length, 5)
    assert.match(warning!, /…/)
})

test('loads flights with a missing departure airport code or an empty aircraft code', () => {
    const noDepartureCode = {...flight, depAirportIata: null}
    const emptyAircraftCode = {...flight, id: 'e1a061f6-bf75-42b9-9b93-e6c86c9321ec', aircraftIata: '', aircraftIcao: ''}
    const result = parseFlights([noDepartureCode, emptyAircraftCode])
    assert.equal(result.skippedFlights, 0)
    assert.equal(result.warning, undefined)
    assert.deepEqual(result.flights, [noDepartureCode, {...emptyAircraftCode, aircraftIata: null, aircraftIcao: null}])
    assert.throws(() => parseFlights([{...flight, depAirportIata: 'ARNX'}]), /depAirportIata \(too_big\)/)
})

test('flights without an airport code stay searchable and display without "null"', () => {
    const noCodes = {...flight, depAirportIata: null, arrAirportIata: null}
    assert.equal(searchFlights([noCodes], {query: 'Stockholm'}).total, 1)
    assert.equal(searchFlights([noCodes], {departure: 'Stockholm', arrival: 'London'}).total, 1)
    assert.equal(searchFlights([noCodes], {departure: 'arn'}).total, 0)
    assert.equal(searchFlights([noCodes], {query: 'null'}).total, 0)
    assert.equal(matchesFlightListSearch(noCodes, 'Stockholm London'), true)
    assert.equal(matchesFlightListSearch(noCodes, 'null'), false)
    assert.equal(summarizeFlight(noCodes).departure.airport, null)
    assert.equal(formatAirport(noCodes.depCity, noCodes.depAirportIata), 'Stockholm')
    assert.equal(formatAirport(flight.depCity, flight.depAirportIata), 'Stockholm (ARN)')
})
