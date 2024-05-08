import { List } from "@raycast/api";
import { useState } from "react";
import { PlayerListItem } from "./components/PlayerListItem/PlayerListItem";
import { useGetPlayers } from "./hooks/useGetPlayers";
import { useSearchPlayer } from "./hooks/useSearchPlayer";

const WtaLiveRanking = () => {
	const { isLoading, players } = useGetPlayers("live-ranking");
	const { searchedPlayers, onSearch, isSearching } = useSearchPlayer(players);

	const [showDetails, setShowDetails] = useState(false);
	const [selectedPlayerId, setSelectedPlayerId] = useState<string>();

	return (
		<List
			navigationTitle="Live WTA ranking"
			isLoading={isLoading}
			searchBarPlaceholder="Search player"
			selectedItemId={selectedPlayerId}
			isShowingDetail={showDetails}
			filtering={false}
			onSearchTextChange={onSearch}
		>
			<List.Section title="Live WTA ranking">
				{searchedPlayers?.map((player, idx) => {
					return (
						<PlayerListItem
							isSearching={isSearching}
							isShowingDetails={showDetails}
							onShowDetails={() => setShowDetails((prev) => !prev)}
							key={idx}
							onShowPlayerInRanking={(playerId) => {
								setSelectedPlayerId(playerId);
								onSearch(undefined);
							}}
							player={player}
						/>
					);
				})}
			</List.Section>
		</List>
	);
};

export default WtaLiveRanking;
