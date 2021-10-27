import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle } from '@raycast/api'
import { flow, pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { useCallback, useEffect, useState } from 'react'
import { fullSearch } from './util/api'
import { is, isError } from './util/fp'
import { DomainStatus, getStatusIcon, SearchResultWithStatus } from './util/types'
import { SEARCH_SUGGESTIONS, STATUS_DESCRIPTIONS, STATUS_MAPPING } from './util/costants'
import useLoading from './util/useLoading'

function DomainrSearch() {
	const loading = useLoading( false )
	const [results, setResults] = useState<ReadonlyArray<SearchResultWithStatus>>( [] )
	const [query, setQuery] = useState( '' )

	const performSearch = useCallback( flow(
		fullSearch,
		TE.map( flow(
			A.filter( O.isSome ),
			A.map( o => o.value ),
			setResults,
			loading.stop
		) ),
		TE.mapLeft( err => pipe(
			err,
			isError,
			is, // returns O.some<null> if the error is a network error
			O.fold(
				() => showToast( ToastStyle.Failure, 'Failed to perform search', 'Invalid response body' ),
				() => showToast( ToastStyle.Failure, 'Failed to perform search', ( err as Error ).message )
			),
			loading.stop
		) )
	), [results, loading] )

	// Perform Search
	useEffect( () => {
		if ( query.length < 3 ) {
			loading.stop()
			return
		}

		loading.start()

		performSearch( query )()
	}, [query] )


	return (
		<List isLoading={loading.status} onSearchTextChange={setQuery} throttle searchBarPlaceholder='Search domains'>
			{results.length === 0 && !loading.status && (
				<List.Section title='Tips & Tricks'>
					{SEARCH_SUGGESTIONS.map( item => (
						<List.Item
							key={item.title}
							{...item}
						/>
					) )}

				</List.Section>
			)}

			{results.map( result => (
				<List.Item
					id={result.domain + result.path}
					key={result.domain + result.path}
					title={result.domain + result.path}
					subtitle={STATUS_MAPPING[result.status]}
					icon={getStatusIcon( STATUS_MAPPING[result.status] )}
					accessoryTitle={STATUS_DESCRIPTIONS[result.status]}
					actions={
						<ActionPanel>
							{[DomainStatus.Available, DomainStatus.Aftermarket].includes( STATUS_MAPPING[result.status] ) && (
								<OpenInBrowserAction title='Register' url={result.registerURL} />
							)}

							{![DomainStatus.Disallowed, DomainStatus.Reserved, DomainStatus.Invalid].includes( STATUS_MAPPING[result.status] ) && (
								<OpenInBrowserAction title='Visit' url={`https://${result.domain}`} />
							)}
						</ActionPanel>
					}
				/>
			) )}
		</List>
	)
}

export default DomainrSearch
