import { Action, ActionPanel, Grid, Icon, List, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { isLeft } from "fp-ts/lib/Either";
import { useState } from "react";

import { api } from "@/lib/apple-music";
import * as scripts from "@/lib/apple-music/scripts";
import { experimental_songSearch } from "@/lib/apple-music/scripts/search";
import useAuth from "@/lib/hooks/useAuth";
import { Artwork, PageMeta, Song } from "@/models/music";

export default function Experimental_PlayLibraryTrack() {
	const [sort, setSort] = useState<string | undefined>();

	const { isLoggedIn, isLoading: isLoadingAuth } = useAuth();
	const { data: tracks, isLoading } = useCachedPromise(api.me.library.songs, [{ sort }], {
		execute: isLoggedIn,
	});

	const play = (song: Song) => async () => {
		const track = await experimental_songSearch(song)();
		if (isLeft(track)) return;

		await scripts.track.play(track.right.id)();

		popToRoot();
	};

	return (
		<ListView
			onPlay={play}
			sorts={tracks?.data.meta.sorts ?? []}
			sort={sort}
			onChangeSort={setSort}
			isLoading={isLoading || isLoadingAuth}
			action={Actions}
			picker={SortPicker}
			data={tracks?.data.data}
		/>
	);
}

const Actions = ({ onPlay }: { onPlay: () => void }) => (
	<ActionPanel>
		<Action title="Play" onAction={onPlay} />
	</ActionPanel>
);

interface SortPickerProps {
	onChange: (sort: string) => void;
	value: string | undefined;
	isLoading: boolean;
	sorts: PageMeta["sorts"];
}

const SortPicker = ({ onChange, value, isLoading, sorts }: SortPickerProps) => (
	<List.Dropdown
		defaultValue="dateAdded"
		onChange={onChange}
		value={value}
		isLoading={isLoading}
		placeholder="Sort"
		tooltip="Sort"
	>
		{sorts.map((sort) => (
			<List.Dropdown.Item title={sort.displayName} value={sort.name} />
		))}
	</List.Dropdown>
);

interface Props {
	action: typeof Actions;
	picker: typeof SortPicker;
	data?: Song[];
	isLoading?: boolean;

	sort?: string;
	onChangeSort: (sort: string) => void;
	sorts: PageMeta["sorts"];

	onPlay: (track: Song) => () => void;
}

const ListView = ({
	action: ViewActions,
	sorts = [],
	sort,
	onChangeSort,
	picker: Picker,
	onPlay,
	data: tracks = [],
	isLoading = false,
}: Props) => (
	<List
		isLoading={isLoading}
		searchBarAccessory={<Picker isLoading={isLoading} value={sort} onChange={onChangeSort} sorts={sorts} />}
	>
		{tracks.map((track, idx) => (
			<List.Item
				id={track.id}
				key={idx}
				title={track.attributes.name}
				icon={Artwork.getUrl(track.attributes.artwork, 60)}
				actions={<ViewActions onPlay={onPlay(track)} />}
			/>
		))}
	</List>
);

const GridView = ({
	action: ViewActions,
	sorts = [],
	sort,
	onChangeSort,
	picker: Picker,
	onPlay,
	data: tracks = [],
	isLoading = false,
}: Props) => (
	<Grid
		isLoading={isLoading}
		searchBarAccessory={<Picker isLoading={isLoading} value={sort} onChange={onChangeSort} sorts={sorts} />}
	>
		{tracks.map((track, idx) => (
			<Grid.Item
				id={track.id}
				key={idx}
				title={track.attributes.name}
				content={Artwork.getUrl(track.attributes.artwork, 500) ?? Icon.Box}
				actions={<ViewActions onPlay={onPlay(track)} />}
			/>
		))}
	</Grid>
);
