import { getLocalStorageItem, setLocalStorageItem } from '@raycast/api'
import * as A from 'fp-ts/Array'
import * as E from 'fp-ts/Either'
import { flow, pipe } from 'fp-ts/function'
import * as TE from 'fp-ts/TaskEither'
import * as t from 'io-ts'

import { parseJson } from './fp'

const HistoryItem = t.type( {
	domain: t.string,
	date: t.number
} )

const History = t.array( HistoryItem )
export type History = t.TypeOf<typeof History>

const LOCAL_STORAGE_KEY: string = '@domainr/history' as const

/**
 *
 * Currently not implemented because the serachbar content can't be updated programmatically
 * until this function isn't available the history feature is disabled to have a more consistent UX
 *
 */

const useHistory = () => {
	const addToHistory = ( history: History ) => ( domain: string ): TE.TaskEither<Error, string> => {
		const date = Date.now()

		return pipe(
			[...history, { domain, date }],
			JSON.stringify,
			item => TE.tryCatch(
				() => setLocalStorageItem( LOCAL_STORAGE_KEY, item ),
				E.toError
			),
			TE.map( () => domain )
		)
	}

	const getHistory: TE.TaskEither<Error | t.Errors, History> = pipe(
		TE.tryCatch(
			() => getLocalStorageItem( LOCAL_STORAGE_KEY ),
			E.toError
		),
		TE.chainEitherKW( data => pipe(
			data,
			d => d?.toString() ?? '[]',
			parseJson,
		) ),
		TE.chainEitherKW( History.decode ),
		TE.map( flow(
			A.takeRight( 3 ),
			arr => arr.sort( ( a, b ) => a.date > b.date ? -1 : 1 )
		) )
	)

	return { addToHistory, loadHistory: getHistory }
}


export default useHistory
