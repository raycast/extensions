// API_KEY: aOnBoyjHYgmshM8uxKMI35B6Tbelp1LzKJ7jsnOlnsQOnkXKys

import axios from 'axios'
import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Reader'

import { getPreferenceValues  } from '@raycast/api'

import { SearchResponse, ISearchResult, ISearchResponse, IStatusResponse, StatusResponse, SearchResultWithStatus } from './types'
import { Errors } from 'io-ts'

type RaycastPreferences = {
	rapidApiToken: string
}

const prefs: RaycastPreferences = getPreferenceValues()

const api = axios.create({
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
				status: d.status
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
