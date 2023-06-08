import { Action, ActionPanel, open, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";

import Experiemntal_AddToPlaylist from "@/components/experimental-views/add-to-playlist";
import { api } from "@/lib/apple-music";
import useAuth from "@/lib/hooks/useAuth";
import { handleResult } from "@/lib/utils";
import { Artwork } from "@/models/music";

function RecentlyPlayed() {
	const { isLoggedIn, isLoading: isLoadingAuth } = useAuth();

	const { data: recentlyPlayed, isLoading: isLoadingRecentlyPlayed } = useCachedPromise(api.me.recentlyPlayed, [], {
		execute: isLoggedIn,
	});

	return (
		<List isLoading={isLoadingAuth || isLoadingRecentlyPlayed}>
			{recentlyPlayed?.data.data.map((item) => (
				<List.Item
					key={item.id}
					icon={Artwork.getUrl(item.attributes.artwork, 60)}
					title={item.attributes.name}
					id={item.id}
					keywords={[item.attributes.name, item.attributes.composerName, item.attributes.albumName]}
					accessories={[
						{
							text: formatDuration(item.attributes.durationInMillis),
						},
					]}
					actions={
						<ActionPanel>
							<Action title="Open" onAction={() => open(item.attributes.url)} />
							<Action
								title="Add to Library"
								onAction={handleResult(
									TE.tryCatch(() => api.me.library.add("songs", item.id), E.toError),
									{
										successText: "Added to library",
									}
								)}
							/>
							<Action.Push
								title="Add to Playlist"
								target={<Experiemntal_AddToPlaylist songId={item.id} />}
							/>
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}

function formatDuration(durationInMillis: number) {
	const duration = new Date(durationInMillis);
	const minutes = duration.getMinutes();
	const seconds = duration.getSeconds();
	return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export default RecentlyPlayed;
