import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { flow, pipe } from "fp-ts/lib/function";
import * as A from "fp-ts/ReadonlyNonEmptyArray";
import * as TE from "fp-ts/TaskEither";
import { useEffect, useState } from "react";

import { Playlist } from "@/models/apple-script";
import * as music from "@/lib/apple-music/scripts";
import { parseResult } from "@/lib/apple-script";
import { handleResult } from "@/lib/utils";
import { SFSymbols } from "@/models/types";

enum PlaylistKind {
	ALL = "all",
	USER = "user",
	SUBSCRIPTION = "subscription",
}

type PlaylistSections = Readonly<Record<string, A.ReadonlyNonEmptyArray<Playlist>>>;

const kindToString = (kind: PlaylistKind) => {
	switch (kind) {
		case PlaylistKind.SUBSCRIPTION:
			return "Apple Music";
		case PlaylistKind.USER:
			return "Your Library";
		default:
			return kind;
	}
};

export default function LegacyAddToPlaylist() {
	const [isLoading, setIsLoading] = useState(false);
	const [playlists, setPlaylists] = useState<PlaylistSections | null>(null);

	useEffect(() => {
		pipe(
			music.playlists.getPlaylists(PlaylistKind.USER),
			TE.mapLeft((e) => {
				console.error(e);
				showToast(Toast.Style.Failure, "Could not get your playlists");
				setIsLoading(false);
			}),
			TE.map(
				flow(
					parseResult<Playlist>(),
					(data) => A.groupBy<Playlist>((playlist) => playlist.kind?.split(" ")?.[0] ?? "Other")(data),
					(data) => {
						setPlaylists(data);
						setIsLoading(false);
					}
				)
			)
		)();
	}, []);

	return (
		<List isLoading={playlists === null || isLoading} searchBarPlaceholder="Search A Playlist">
			{Object.entries(playlists ?? {})
				.filter(([section]) => section !== "library")
				.map(([section, data]) => (
					<List.Section title={kindToString(section as PlaylistKind)} key={section}>
						{data.map((playlist) => (
							<List.Item
								key={playlist.id}
								title={playlist.name}
								accessories={[
									{
										icon: Icon.Music,
										text: `${playlist.count}`,
									},
									{
										icon: Icon.Clock,
										text: `${Math.floor(Number(playlist.duration) / 60)} min`,
									},
								]}
								icon={{ source: "../assets/icon.png" }}
								actions={
									<ActionPanel>
										<Action
											title={`Add to Playlist ${playlist.name}`}
											icon={Icon.PlusCircle}
											onAction={handleResult(music.currentTrack.addToPlaylist(playlist.name), {
												errorMessage: `${SFSymbols.WARNING} Could not add current track to this playlist`,
												successText: `${SFSymbols.ADD_TO_LIBRARY} Track added to playlist "${playlist.name}"`,
												loading: `${SFSymbols.ADD_TO_LIBRARY} Adding track to playlist "${playlist.name}"`,
												closeView: true,
											})}
										/>
									</ActionPanel>
								}
							/>
						))}
					</List.Section>
				))}
		</List>
	);
}
