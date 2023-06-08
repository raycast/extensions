import { Action, ActionPanel, Icon, Image, List, popToRoot, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { api } from "../../lib/apple-music";
import useAuth from "../../lib/hooks/useAuth";
import useCurrentlyPlaying from "../../lib/hooks/useCurrentlyPlaying";
import { Artwork } from "../../models/music";

interface Props {
	songId?: string;
}

export default function Experiemntal_AddToPlaylist({ songId }: Props) {
	const { isLoggedIn, isLoading: isLoadingAuth } = useAuth();

	const { song, isLoading: isLoadingPlayer } = useCurrentlyPlaying();
	const { data: playlists, isLoading: isLoadingPlaylists } = useCachedPromise(api.me.library.playlists, [], {
		execute: isLoggedIn,
	});

	const isLoading = isLoadingPlayer || isLoadingPlaylists || isLoadingAuth;
	const [isAdding, setIsAdding] = useState(false);

	const addToPlaylist = (playlistId: string) => async () => {
		if (songId) {
			setIsAdding(true);
			await api.me.library.playlist.addTrack(playlistId, songId);
			setIsAdding(false);
		} else if (song) {
			setIsAdding(true);
			await api.me.library.playlist.addTrack(playlistId, songId ?? song.id);
			setIsAdding(false);
		}

		showHUD("Added to playlist");
		popToRoot();
	};

	return (
		<List
			isLoading={isLoading || isAdding}
			navigationTitle="Add to Playlist"
			searchBarPlaceholder="Filter playlists"
		>
			{playlists?.data.data
				.filter((p) => p.attributes.canEdit)
				.map((playlist) => (
					<List.Item
						key={playlist.id}
						title={playlist.attributes.name}
						subtitle={playlist.attributes.description?.short ?? playlist.attributes.description?.standard}
						accessories={[
							{
								date: new Date(playlist.attributes.dateAdded),
							},
						]}
						icon={{
							source: Artwork.getUrl(playlist.attributes.artwork, 60) ?? Icon.Box,
							fallback: Icon.Box,
							mask: Image.Mask.RoundedRectangle,
						}}
						actions={
							<ActionPanel>
								<Action title="Add" onAction={addToPlaylist(playlist.id)} />
							</ActionPanel>
						}
					/>
				))}
		</List>
	);
}
