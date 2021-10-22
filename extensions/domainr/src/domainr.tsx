import { ActionPanel, Color, Icon, ImageMask, List, OpenInBrowserAction, showToast, ToastStyle } from '@raycast/api'
import { useEffect, useState } from 'react'
import { fullSearch, search } from './util/api'
import { PathReporter } from 'io-ts/PathReporter'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import * as O from 'fp-ts/Option'
import * as A from 'fp-ts/ReadonlyArray'
import { getStatusIcon, isAvailable, parseDomainStatus, SearchResultWithStatus } from './util/types'
import { pipe } from 'fp-ts/lib/function'
import { is, isError } from './util/conditional'

function DomainrSearch() {
	const [ results, setResults ] = useState<ReadonlyArray<SearchResultWithStatus>>([])
	const [ query, setQuery ] = useState('')


	useEffect(() => {
		if ( query.length < 3 ) return

		pipe(
			query,
			fullSearch,
			TE.map(results =>  pipe(
				results,
				A.filter(O.isSome),
				A.map(o => o.value),
				setResults
			)),
			TE.mapLeft(err => pipe(
				err,
				isError,
				is, // returns O.some<null> if the error is a network error
				O.fold(
					() => showToast(ToastStyle.Failure, 'Failed to perform search', 'Invalid response body'),
					() => showToast(ToastStyle.Failure, 'Failed to perform search', (err as Error).message)
				)
			))
		)()
	}, [query])


	return (
		<List isLoading={results.length === 0} onSearchTextChange={setQuery} throttle searchBarPlaceholder='Search domains'>
			{results.map(result => (
				<List.Item
					id={result.domain + result.path}
					key={result.domain + result.path}
					title={result.domain + result.path}
					subtitle={parseDomainStatus(result.status)}
					icon={{
						source: `https://${result.domain}/favicon.ico`,
						mask: ImageMask.RoundedRectangle
					}}
					accessoryIcon={getStatusIcon(parseDomainStatus(result.status))}
					actions={
						<ActionPanel>
							{isAvailable(parseDomainStatus(result.status)) && (
								<OpenInBrowserAction title='Register' url={result.registerURL} />
							)}
							<OpenInBrowserAction title='Visit' url={`https://${result.domain}`} />
						</ActionPanel>
					}
				/>
			))}
		</List>
	)
}

export default DomainrSearch
