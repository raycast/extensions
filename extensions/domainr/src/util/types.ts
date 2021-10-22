import { Color, Icon } from '@raycast/api'
import { string } from 'fp-ts'
import * as t from 'io-ts'
import { match } from 'ts-pattern'

// Search
export const SearchResult = t.type({
	domain: t.string,
	host: t.string,
	subdomain: t.string,
	zone: t.string,
	path: t.string,
	registerURL: t.string
})

export const SearchResponse = t.type({
	results: t.array(SearchResult)
})

export type ISearchResult = t.TypeOf<typeof SearchResult>
export type ISearchResponse = t.TypeOf<typeof SearchResponse>


// Status
export const StatusResult = t.type({
	domain: t.string,
	zone: t.string,
	status: t.string,
	summary: t.string
})

export const StatusResponse = t.type({
	status: t.array(StatusResult)
})

export type IStatusResult = t.TypeOf<typeof StatusResult>
export type IStatusResponse = t.TypeOf<typeof StatusResponse>


export enum DomainStatus {
	Unknown = 'Unknown',
	Available = 'Available',
	Pending = 'Available',
	Disallowed = 'Disallowed',
	Invalid = 'Invalid',
	Reserved = 'Reserved',
	Taken = 'Taken',
	Aftermarket = 'Aftermarket',
}

export type SearchResultWithStatus = ISearchResult & {
	status: string | DomainStatus
}

const statusMapping: Record<string, DomainStatus> = {
	unknown: DomainStatus.Unknown,
	undelegated: DomainStatus.Available,
	inactive: DomainStatus.Available,
	pending: DomainStatus.Pending,
	claimed: DomainStatus.Taken,
	reserved: DomainStatus.Reserved,
	disallowed: DomainStatus.Disallowed,
	dpml: DomainStatus.Reserved,
	invalid: DomainStatus.Invalid,
	active: DomainStatus.Aftermarket,
	parked: DomainStatus.Aftermarket,
	marketed: DomainStatus.Aftermarket,
	expiring: DomainStatus.Taken,
	priced: DomainStatus.Available,
	premium: DomainStatus.Available,
	tld: DomainStatus.Available,
	zone: DomainStatus.Available,
}

export const parseDomainStatus = (status: string): string => {
	const statuses = status
		.split(' ')
		.map(k => statusMapping[k.toLowerCase()])

	const data = Array.from(new Set(statuses))


	const isAfterMarket = data.some(s => s === DomainStatus.Aftermarket)
	const isAvailable = data.some(s => s === DomainStatus.Available)

	if ( isAfterMarket ) {
		return DomainStatus.Aftermarket
	}

	if ( isAvailable ) {
		return DomainStatus.Available
	}

	if ( data.length === 1 ) return data[0]

	return data.join(', ')
}


export const isAvailable = (status: string): boolean => {
	return status === DomainStatus.Available || /Available|Aftermarket/g.test(status)
}

export const getStatusIcon = (status: string) =>
	match(status)
		.with(DomainStatus.Available, () => ({
			source: Icon.Checkmark,
			tintColor: Color.Green
		}))
		.with(DomainStatus.Aftermarket, () => ({
			source: Icon.QuestionMark,
			tintColor: Color.Yellow
		}))
		.otherwise( () => ({
			source: Icon.XmarkCircle,
			tintColor: Color.Red
		}))
