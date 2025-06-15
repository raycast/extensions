import { List } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useRankings } from "./lib/hooks/use-rankings";
import { LeagueDropdown } from "./lib/components/league-dropdown";

export default function ShowStandings() {
  const [leagueId, setLeagueId] = useCachedState("leagueId", "109940824119741550");
  const { rankings, isLoading } = useRankings(leagueId);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search teams and positions"
      searchBarAccessory={<LeagueDropdown value={leagueId} onChange={setLeagueId} />}
    >
      {rankings?.flatMap(({ teams, ordinal }) => {
        return teams.map((team) => (
          <List.Item
            key={team.id}
            icon={team.image.replace("http://", "https://")}
            title={ordinal.toString()}
            subtitle={team.name}
            accessories={[
              {
                text: `${team.record?.wins}W - ${team.record?.losses}L`,
                tooltip: `${team.record?.wins} Wins - ${team.record?.losses} Losses`,
              },
            ]}
          />
        ));
      })}
    </List>
  );
}
