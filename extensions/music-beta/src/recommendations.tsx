import { Action, ActionPanel, Grid, Icon, List, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { api, scripts } from "@/lib/apple-music";
import useAuth from "@/lib/hooks/useAuth";
import { Artwork, Recommendation } from "@/models/music";
import { useState } from "react";
import ViewPicker from "@/components/ViewPicker";

export default function Recommendations() {
	const [view, setView] = useState("list");

	const { isLoggedIn, isLoading: isLoadingAuth, isMusicApiEnabled } = useAuth();
	const { data: recommendations, isLoading: isLoadingRecommendations } = useCachedPromise(
		api.me.recommendations,
		[],
		{
			execute: isLoggedIn,
		}
	);

	const isLoading = isLoadingAuth || isLoadingRecommendations;

	if (!isMusicApiEnabled) {
		return null;
	}

	let View = ListView;
	if (view === "grid") {
		View = GridView;
	}

	return (
		<View
			title={"Recommendations"}
			isLoading={isLoading}
			elements={recommendations?.data.data}
			onViewChange={setView}
		/>
	);
}

interface Props {
	elements?: Recommendation[];
	isLoading?: boolean;
	onViewChange: (view: string) => void;
	title: string;
}

type ArrayElement<T> = T extends (infer V)[] ? V : never;

const Actions = ({ content }: { content: ArrayElement<Recommendation["relationships"]["contents"]["data"]> }) => (
	<ActionPanel>
		<Action
			title="View in Apple Music"
			onAction={async () => {
				await scripts.general.activate();
				await open(content.attributes.url, "com.apple.Music");
			}}
		/>
	</ActionPanel>
);

const ListView = ({ isLoading = false, elements = [], onViewChange, title }: Props) => (
	<List isLoading={isLoading} searchBarAccessory={<ViewPicker onViewChange={onViewChange} />} navigationTitle={title}>
		{elements.map((section) => (
			<List.Section key={section.id} title={section.attributes.title.stringForDisplay}>
				{section.relationships?.contents.data.map((item) => (
					<List.Item
						key={item.id}
						title={item.attributes.name}
						icon={Artwork.getUrl(item.attributes.artwork, 200) ?? Icon.Box}
						actions={<Actions content={item} />}
					/>
				))}
			</List.Section>
		))}
	</List>
);

const GridView = ({ elements = [], isLoading = false, onViewChange, title }: Props) => (
	<Grid isLoading={isLoading} searchBarAccessory={<ViewPicker onViewChange={onViewChange} />} navigationTitle={title}>
		{elements.map((item) => (
			<Grid.Section
				key={item.id}
				title={item.attributes.title.stringForDisplay}
				subtitle={item.attributes.reason?.stringForDisplay}
			>
				{item.relationships?.contents?.data.map((content) => (
					<Grid.Item
						key={content.id}
						title={content.attributes.name}
						content={Artwork.getUrl(content.attributes.artwork, 200) ?? Icon.Box}
						actions={<Actions content={content} />}
					/>
				))}
			</Grid.Section>
		))}
	</Grid>
);
