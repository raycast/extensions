import { List } from "@raycast/api";
import { FC, useState } from "react";
import { PlayerListItem } from "../components/PlayerListItem/PlayerListItem";
import { useGetRankings } from "../hooks/useGetRankings";
import { useSearchPlayer } from "../hooks/useSearchPlayer";
import { Organization } from "../types/organization";
import { PlayerListSearchBarAccessory } from "../components/PlayerListSearchBarAccessory/PlayerListSearchBarAccessory";

type LiveRankingListProps = {
  organization: Organization;
};

export const LiveRankingList: FC<LiveRankingListProps> = ({ organization }) => {
  const { isLoading, players } = useGetRankings({ organization, endpoint: "live-ranking" });
  const { searchedPlayers, onSearch, isSearching, playerCountries, countryCode, onFilterByCountry } =
    useSearchPlayer(players);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();

  const title = `${organization.toUpperCase()} Live Rankings`;

  return (
    <List
      navigationTitle={title}
      isLoading={isLoading}
      searchBarPlaceholder="Search player"
      selectedItemId={selectedPlayerId}
      isShowingDetail={showDetails}
      filtering={false}
      onSearchTextChange={onSearch}
      searchBarAccessory={
        playerCountries ? (
          <PlayerListSearchBarAccessory
            onFilterByCountry={onFilterByCountry}
            value={countryCode}
            playerCountries={playerCountries}
          />
        ) : null
      }
    >
      <List.Section title={title}>
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
                onFilterByCountry("all");
              }}
              player={player}
            />
          );
        })}
      </List.Section>
    </List>
  );
};
