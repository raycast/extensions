import { getPreferenceValues } from '@raycast/api'
import axios from 'axios'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as TE from 'fp-ts/TaskEither'
import { Errors } from 'io-ts'
import { ISearchResponse, ISearchResult, IStatusResponse, SearchResponse, SearchResultWithStatus, StatusResponse } from './types'
import { setupCache } from 'axios-cache-adapter'



type RaycastPreferences = {
	rapidApiToken: string
}

const prefs: RaycastPreferences = getPreferenceValues()

const cache = setupCache({
	maxAge: 1000 * 60 * 15 // 15 min cache
})

const api = axios.create({
	adapter: cache.adapter,
	baseURL: 'https://domainr.p.rapidapi.com/v2/',
	headers: {
		'x-rapidapi-host': 'domainr.p.rapidapi.com',
		'x-rapidapi-key': prefs.rapidApiToken
	  },
	params: {
		'mashape-key': prefs.rapidApiToken,
	}
})

export const getDomainStatus: R.Reader<ISearchResult, TE.TaskEither<Error | Errors, O.Option<SearchResultWithStatus>>> = pipe(
	R.ask<ISearchResult>(),
	R.map(result => pipe(
		TE.tryCatch(
			() => api.get<IStatusResponse>('/status', {
				params: {
					domain: result.domain
				}
			}),
			E.toError
		),
		TE.chainEitherKW(r => pipe(
			r.data,
			StatusResponse.decode
		)),
		TE.map(r => pipe(
			r.status,
			A.map(d => ({
				...result,
				status: d.summary
			})),
			A.head,
		))
	))
)

export const search = (query: string): TE.TaskEither<Errors | Error, ISearchResult[]> => pipe(
	TE.tryCatch(
		() => api.get<ISearchResponse>('/search', {
			params: {
				query
			}
		}),
		E.toError
	),
	TE.chainEitherKW(r => pipe(
		r.data,
		SearchResponse.decode,
	)),
	TE.map(({ results }) => results)
)




export const fullSearch = (query: string) => pipe(
	query,
	search,
	TE.chain(domains => pipe(
		domains,
		A.map(getDomainStatus),
		TE.sequenceArray
	))
)
