import { Color, Icon } from '@raycast/api'
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

export const statusMapping: Record<string, DomainStatus> = {
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
	transferable: DomainStatus.Aftermarket,
	premium: DomainStatus.Available,
	suffix: DomainStatus.Disallowed,
	tld: DomainStatus.Disallowed,
	zone: DomainStatus.Disallowed,
}

export const statusDescriptionMapping: Record<string, string> = {
	unknown: 'Unknown status, usually resulting from an error or misconfiguration.',
	undelegated: 'The domain is not present in DNS.',
	inactive: 'Available for new registration.',
	pending: 'TLD not yet in the root zone file.',
	disallowed: 'Disallowed by the registry, ICANN, or other (wrong script, etc.).',
	claimed: 'Claimed or reserved by some party (not available for new registration).',
	reserved: 'Explicitly reserved by ICANN, the registry, or another party.',
	dpml: 'Domains Protected Marks List, reserved for trademark holders.',
	invalid: 'Technically invalid, e.g. too long or too short.',
	active: 'Registered, but possibly available via the aftermarket.',
	parked: 'Active and parked, possibly available via the aftermarket.',
	marketed: 'Explicitly marketed as for sale via the aftermarket.',
	expiring: 'e.g. in the Redemption Grace Period, and possibly available via a backorder service. Not guaranteed to be present for all expiring domains.',
	deleting: 'e.g. in the Pending Delete phase, and possibly available via a backorder service. Not guaranteed to be present for all deleting domains.',
	priced: 'e.g. via the BuyDomains service.',
	transferable: 'e.g. in the Afternic inventory.',
	premium: 'Premium domain name for sale by the registry.',
	suffix: 'A public suffix according to publicsuffix.org.',
	tld: 'A top-level domain.',
	zone: 'A zone (domain extension) in the Domainr database.',
}

export const parseDomainStatus = (status: string): string => {
	return statusMapping[status.toLowerCase()]
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
