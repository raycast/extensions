import { ActionPanel, Icon, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle } from '@raycast/api'
import { pipe } from 'fp-ts/lib/function'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/ReadonlyArray'
import * as TE from 'fp-ts/TaskEither'
import { useEffect, useState } from 'react'
import { fullSearch } from './util/api'
import { is, isError } from './util/conditional'
import { DomainStatus, getStatusIcon, SearchResultWithStatus, statusDescriptionMapping, statusMapping } from './util/types'
import useLoading from './util/useLoading'

function DomainrSearch() {
	const loading = useLoading(true)
	const [ results, setResults ] = useState<ReadonlyArray<SearchResultWithStatus>>([])
	const [ query, setQuery ] = useState('')


	useEffect(() => {
		if ( query.length < 3 ) return

		loading.start()

		pipe(
			query,
			fullSearch,
			TE.map(results =>  pipe(
				results,
				A.filter(O.isSome),
				A.map(o => o.value),
				setResults,
				loading.stop
			)),
			TE.mapLeft(err => pipe(
				err,
				isError,
				is, // returns O.some<null> if the error is a network error
				O.fold(
					() => showToast(ToastStyle.Failure, 'Failed to perform search', 'Invalid response body'),
					() => showToast(ToastStyle.Failure, 'Failed to perform search', (err as Error).message)
				),
				loading.stop
			))
		)()
	}, [query])


	return (
		<List isLoading={loading.status} onSearchTextChange={setQuery} throttle searchBarPlaceholder='Search domains'>
			{results.map(result => (
				<List.Item
					id={result.domain + result.path}
					key={result.domain + result.path}
					title={result.domain + result.path}
					subtitle={statusMapping[result.status]}
					icon={{
						...getStatusIcon(statusMapping[result.status]),
						// source: Icon.Globe
					}}
					accessoryTitle={statusDescriptionMapping[result.status]}
					// accessoryIcon={getStatusIcon(statusMapping[result.status]).source}
					actions={
						<ActionPanel>
							{[DomainStatus.Available, DomainStatus.Aftermarket].includes(statusMapping[result.status]) && (
								<OpenInBrowserAction title='Register' url={result.registerURL} />
							)}

							{![DomainStatus.Disallowed, DomainStatus.Reserved, DomainStatus.Invalid].includes(statusMapping[result.status]) && (
								<OpenInBrowserAction title='Visit' url={`https://${result.domain}`} />
							)}
						</ActionPanel>
					}
				/>
			))}
		</List>
	)
}

export default DomainrSearch
