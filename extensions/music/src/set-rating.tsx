import { Icon, List } from '@raycast/api'
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither'
import { useEffect, useState } from 'react'
import { Track } from './util/models';
import * as music from "./util/scripts";
import { handleError } from './util/utils';


export default async () => {
	const [track, setTrack] = useState<Readonly<Track> | null>( null )

	useEffect( () => {
		pipe(
			music.currentTrack.getCurrentTrack(),
			TE.matchW(
				handleError,
				setTrack
			)
		)()
	}, [] )

	return (
		<List navigationTitle={track ? track.name : 'Loading current track'} isLoading={!track}>
			<List.Item title={'5'} icon={Icon.Star} />
			<List.Item title={'4'} icon={Icon.Star} />
			<List.Item title={'3'} icon={Icon.Star} />
			<List.Item title={'2'} icon={Icon.Star} />
			<List.Item title={'1'} icon={Icon.Star} />
			<List.Item title={'0'} icon={Icon.Star} />
		</List>
	)
}
