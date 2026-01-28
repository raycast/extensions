import { Color, List } from "@raycast/api";
import { FC, useState } from "react";
import { PlayerListItem } from "../components/PlayerListItem/PlayerListItem";
import { useGetRankings } from "../hooks/useGetRankings";
import { useSearchPlayer } from "../hooks/useSearchPlayer";
import { Organization } from "../types/organization";
import { PlayerListSearchBarAccessory } from "../components/PlayerListSearchBarAccessory/PlayerListSearchBarAccessory";

type RaceRankingListProps = {
  organization: Organization;
};

export const RaceRankingList: FC<RaceRankingListProps> = ({ organization }) => {
  const { isLoading, players } = useGetRankings({ organization, endpoint: "race" });
  const { searchedPlayers, onSearch, isSearching, onFilterByCountry, countryCode, playerCountries } =
    useSearchPlayer(players);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>();

  const title = `${organization.toUpperCase()} Race Rankings`;
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
