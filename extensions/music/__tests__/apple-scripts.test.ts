import { createQueryString, parseQueryString } from '../src/util/apple-script'
import { describe, it, expect } from 'vitest'

describe('createQueryString', () => {
	it('Should create a querystring template from object', () => {
		const result = createQueryString({
			id: 'trackId',
			name: 'trackName',
		})

		expect(result).toEqual('"id=" & trackId & "&name=" & trackName')
	})
})

describe('parseQueryString', () => {
	it('Should parse a standard querystring to object', () => {
		const result = parseQueryString()('id=trackId&name=trackName')
		expect(result).toStrictEqual({
			id: 'trackId',
			name: 'trackName',
		})
	})
})
