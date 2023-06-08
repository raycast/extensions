import { Action, ActionPanel, closeMainWindow, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as S from "fp-ts/string";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { useCallback, useState } from "react";

import { fromEmptyOrNullable } from "@/lib/fp/option";
import * as music from "@/lib/apple-music/scripts";
import { ASTrack as Track } from "@/lib/apple-music/scripts/search";
import { SFSymbols } from "@/models/types";
import { parseResult } from "@/lib/apple-script";

export default function PlayLibraryTrack() {
	const [tracks, setTracks] = useState<readonly Track[] | null>([]);
	const { pop } = useNavigation();

	const onSearch = useCallback(
		async (next: string) => {
			setTracks(null); // start loading

			if (!next || next?.length < 1) {
				setTracks([]);
				return;
			}

			await pipe(
				next,
				S.trim,
				music.track.search,
				TE.matchW(
					() => {
						showToast(Toast.Style.Failure, "Could not get tracks");
						return [] as ReadonlyArray<Track>;
					},
					(tracks) =>
						pipe(
							tracks,
							fromEmptyOrNullable,
							O.matchW(() => [] as ReadonlyArray<Track>, parseResult<Track>())
						)
				),
				T.map(setTracks)
			)();
		},
		[setTracks]
	);

	return (
		<List
			isLoading={tracks === null}
			searchBarPlaceholder="Search A Song By Title Or Artist"
			onSearchTextChange={onSearch}
			throttle
		>
			{(tracks ?? [])?.map(({ id, name, artist, album }) => (
				<List.Item
					key={id}
					title={name}
					subtitle={SFSymbols.ARTIST + ` ${artist}`}
					accessories={[{ text: SFSymbols.MUSIC_NOTE + ` ${album}` }]}
					icon={{ source: "../assets/icon.png" }}
					actions={<Actions name={name} id={id ?? ""} pop={pop} />}
				/>
			))}
		</List>
	);
}

function Actions({ name, pop, id }: { id: string; name: string; pop: () => void }) {
	const title = `Start Track "${name}"`;

	const handleSubmit = async () => {
		await pipe(
			id,
			music.track.playById,
			TE.map(() => closeMainWindow()),
			TE.mapLeft(() => showToast(Toast.Style.Failure, "Could not play this track"))
		)();

		pop();
	};

	return (
		<ActionPanel>
			<Action title={title} onAction={handleSubmit} icon={Icon.Play} />
		</ActionPanel>
	);
}
