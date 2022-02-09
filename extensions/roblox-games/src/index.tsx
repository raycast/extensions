import {
	ActionPanel,
	getPreferenceValues,
	Icon,
	List,
	OpenInBrowserAction,
	showToast,
	SubmitFormAction,
	ToastStyle
} from "@raycast/api";
import { spawnSync } from "child_process";
import { AbortError } from "node-fetch";
import { useEffect, useRef, useState } from "react";
import { getGameLaunchTicket } from "./auth";
import { getIcon } from "./icons";
import performSearch from "./search";

async function launchGame(gameId: number) {
	const toast = await showToast(ToastStyle.Animated, "Launching game...", "Requesting ticket...");
	const ticket = await getGameLaunchTicket();
	toast.message = "Launching game...";
	spawnSync("open", [
		"-b",
		"com.roblox.RobloxPlayer",
		"--args",
		"-ticket",
		ticket,
		"-scriptURL",
		"https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame&browserTrackerId=133769&isPlayTogetherGame=false&placeId=" +
			gameId,
		"-browserTrackerId",
		"133769",
	]);
	toast.hide();
}

export default function Command() {
	const { state, search } = useSearch();
	return (
		<List isLoading={state.isLoading} onSearchTextChange={search} searchBarPlaceholder="Search by name..." throttle>
			<List.Section title="Results" subtitle={state.results.length + ""}>
				{state.results.map((searchResult) => (
					<SearchListItem key={searchResult.id} searchResult={searchResult} />
				))}
			</List.Section>
		</List>
	);
}

function SearchListItem({ searchResult }: { searchResult: Game }) {
	return (
		<List.Item
			title={searchResult.name}
			subtitle={searchResult.gameDescription}
			icon={getIcon("GameIcon:" + searchResult.universeId)}
			accessoryTitle={
				getPreferenceValues().accessory == "author"
					? searchResult.creatorName
					: searchResult.playerCount.toLocaleString()
			}
			accessoryIcon={
				getPreferenceValues().accessory == "author"
					? getIcon(
							(searchResult.creatorType == "Group" ? "GroupIcon:" : "AvatarHeadShot:") +
								searchResult.creatorId,
					  )
					: Icon.Person
			}
			actions={
				<ActionPanel>
					<ActionPanel.Section>
						<SubmitFormAction
							title="Play Game"
							onSubmit={() => {
								launchGame(searchResult.placeId);
							}}
							icon={Icon.ArrowRight}
						/>
						<OpenInBrowserAction
							title="Open in browser"
							url={`https://roblox.com/games/${searchResult.placeId}`}
							shortcut={{ modifiers: ["cmd"], key: "." }}
						/>
					</ActionPanel.Section>
				</ActionPanel>
			}
		/>
	);
}

function useSearch() {
	const [state, setState] = useState<SearchState>({ results: [], isLoading: true });
	const cancelRef = useRef<AbortController | null>(null);

	useEffect(() => {
		search("");
		return () => {
			cancelRef.current?.abort();
		};
	}, []);

	async function search(searchText: string) {
		cancelRef.current?.abort();
		cancelRef.current = new AbortController();
		try {
			setState((oldState) => ({
				...oldState,
				isLoading: true,
			}));
			const results = await performSearch(searchText, cancelRef.current.signal);
			setState((oldState) => ({
				...oldState,
				results: results,
				isLoading: false,
			}));
		} catch (error) {
			if (error instanceof AbortError) {
				return;
			}
			console.error("search error", error);
			showToast(ToastStyle.Failure, "Could not perform search", String(error));
		}
	}

	return {
		state: state,
		search: search,
	};
}
