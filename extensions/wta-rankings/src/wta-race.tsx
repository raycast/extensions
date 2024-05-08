import { Color, List } from "@raycast/api";
import { useState } from "react";
import { PlayerListItem } from "./components/PlayerListItem/PlayerListItem";
import { useGetPlayers } from "./hooks/useGetPlayers";
import { useSearchPlayer } from "./hooks/useSearchPlayer";

const WtaRace = () => {
	const { isLoading, players } = useGetPlayers("race");
	const { searchedPlayers, onSearch, isSearching } = useSearchPlayer(players);

	const [showDetails, setShowDetails] = useState(false);
	const [selectedPlayerId, setSelectedPlayerId] = useState<string>();

	return (
		<List
			navigationTitle="Live WTA race ranking"
			isLoading={isLoading}
			searchBarPlaceholder="Search player"
			selectedItemId={selectedPlayerId}
			isShowingDetail={showDetails}
			filtering={false}
			onSearchTextChange={onSearch}
		>
			<List.Section title="Live WTA race">
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
							additionalAccessories={
								player.ranking <= 8
									? [
											{
												tag: {
													value: "Q",
													color: Color.Yellow,
												},
											},
									  ]
									: null
							}
						/>
					);
				})}
			</List.Section>
		</List>
	);
};

export default WtaRace;
