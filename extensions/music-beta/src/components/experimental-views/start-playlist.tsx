import { api, scripts } from "@/lib/apple-music";
import useAuth from "@/lib/hooks/useAuth";
import { Artwork, LibraryPlaylists } from "@/models/music";
import { Action, ActionPanel, Grid, Icon, Image, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import ViewPicker, { useViewPreference } from "../ViewPicker";
import { flow } from "fp-ts/lib/function";
import * as TE from "@/lib/fp/task-either";
import { handleResult } from "@/lib/utils";

export default function Experimental_StartPlaylist() {
	const [view, setView] = useViewPreference();
	const { isLoggedIn, isLoading: isLoadingAuth } = useAuth();

	const { data: playlists, isLoading: isLoadingPlaylists } = useCachedPromise(api.me.library.playlists, [], {
		execute: isLoggedIn,
	});

	let View = ListView;
	if (view === "grid") {
		View = GridView;
	}

	return (
		<View playlists={playlists?.data.data} isLoading={isLoadingPlaylists || isLoadingAuth} onViewChange={setView} />
	);
}

interface Props {
	playlists?: LibraryPlaylists[];
	isLoading?: boolean;
	onViewChange: (view: string) => void;
}

const Actions = ({ playlist }: { playlist: LibraryPlaylists }) => (
	<ActionPanel>
		<Action
			title="Start Playlist"
			onAction={async () => {
				const name = playlist.attributes.name;

				const playByName = flow(scripts.playlists.findPlaylist, TE.chain(scripts.playlists.playById()));

				return handleResult(playByName(name), {
					successText: `Started playlist ${name}`,
					errorMessage: `Could not start playlist ${name}`,
					loading: `Starting playlist ${name}`,
				})();
			}}
		/>
		{playlist.attributes.url && (
			<Action title="View in Music" onAction={() => open(playlist.attributes.url, "com.apple.Music")} />
		)}
	</ActionPanel>
);

const GridView = ({ playlists = [], onViewChange, isLoading = false }: Props) => {
	return (
		<Grid isLoading={isLoading} searchBarAccessory={<ViewPicker onViewChange={onViewChange} />}>
			<Grid.Section title="Your playlists">
				{playlists
					.filter((p) => p.attributes.canEdit)
					.map((playlist) => (
						<Grid.Item
							key={playlist.id}
							id={playlist.id}
							title={playlist.attributes.name}
							actions={<Actions playlist={playlist} />}
							content={{
								source: Artwork.getUrl(playlist.attributes.artwork, 500) ?? Icon.Box,
							}}
						/>
					))}
			</Grid.Section>
			<Grid.Section title="Others">
				{playlists
					.filter((p) => !p.attributes.canEdit)
					.map((playlist) => (
						<Grid.Item
							key={playlist.id}
							id={playlist.id}
							title={playlist.attributes.name}
							actions={<Actions playlist={playlist} />}
							content={{
								source: Artwork.getUrl(playlist.attributes.artwork, 500) ?? Icon.Box,
							}}
						/>
					))}
			</Grid.Section>
		</Grid>
	);
};

const ListView = ({ playlists = [], onViewChange, isLoading = false }: Props): JSX.Element | null => {
	return (
		<List isLoading={isLoading} searchBarAccessory={<ViewPicker onViewChange={onViewChange} />}>
			{playlists.map((playlist) => (
				<List.Item
					key={playlist.id}
					id={playlist.id}
					title={playlist.attributes.name}
					actions={<Actions playlist={playlist} />}
					icon={{
						tintColor: playlist.attributes.artwork?.bgColor,
						source: Artwork.getUrl(playlist.attributes.artwork, 500) ?? Icon.Box,
						mask: Image.Mask.RoundedRectangle,
					}}
				/>
			))}
		</List>
	);
};
