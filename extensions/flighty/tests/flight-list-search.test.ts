import {test} from 'node:test'
import assert from 'node:assert/strict'
import {matchesFlightListSearch} from '../src/flight-list-search.ts'
import {flight} from './fixtures/flight.ts'

test('list search matches flight numbers and terms across flight fields', () => {
    for (const query of ['', '   ', '1415', 'sk 1415', 'SK1415', 'sas1415', 'Scandinavian', 'arn London', 'Stockholm LHR']) {
        assert.equal(matchesFlightListSearch(flight, query), true, query)
    }
    for (const query of ['9999', '1415 Paris', 'null']) {
        assert.equal(matchesFlightListSearch(flight, query), false, query)
    }
})

test('list search retains aircraft and booking code searches', () => {
    const detailed = {...flight, aircraftIata: '320', aircraftIcao: 'A320', aircraftName: 'Airbus A320', aircraftTailNumber: 'SE-ABC'}
    for (const query of ['320', 'a320', 'Airbus', 'se-abc', 'private']) {
        assert.equal(matchesFlightListSearch(detailed, query), true, query)
    }
    assert.equal(matchesFlightListSearch({...flight, pnr: null}, 'private'), false)
})
