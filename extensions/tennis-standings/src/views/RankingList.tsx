import { Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useRankings } from "../hooks";

interface RankingListProps {
  rankingType: "atp" | "wta";
}

function RankingList({ rankingType }: RankingListProps) {
  const [rankings, isLoading] = useRankings(rankingType);
  const [filterType, setFilterType] = useState("player");
  const [searchText, setSearchText] = useState("");

  const selectedRankings = rankings.filter((standing) => {
    const searchValue = String(filterType === "player" ? standing.rowName : standing.team?.country?.name).toLowerCase();
    return searchValue.includes(searchText.toLowerCase());
  });

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select a filter"
          storeValue={true}
          onChange={(newValue) => {
            setFilterType(newValue);
            setSearchText("");
          }}
        >
          <List.Dropdown.Section title="Filter By">
            <List.Dropdown.Item title="Player" value="player" icon={Icon.Filter} />
            <List.Dropdown.Item title="Country" value="country" icon={Icon.Filter} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      searchBarPlaceholder={filterType === "player" ? "Filter by player" : "Filter by country"}
      onSearchTextChange={setSearchText}
    >
      <List.Section title={`${rankingType.toUpperCase()} Rankings`}>
        {selectedRankings.map(
          (standing) =>
            standing.rowName && (
              <List.Item
                key={standing.id}
                icon={{ source: Icon.Racket, tintColor: Color.PrimaryText }}
                title={`${standing.ranking}. ${standing.rowName}`}
                subtitle={standing.team?.country?.name}
                accessories={[{ text: `${standing.points}`, icon: Icon.Leaderboard, tooltip: "Points" }]}
              />
            ),
        )}
      </List.Section>
    </List>
  );
}

export default RankingList;
