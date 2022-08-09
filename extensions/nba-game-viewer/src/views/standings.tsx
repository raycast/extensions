import { List } from "@raycast/api";
import { Team } from "../types/standings.types";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";

const Standings = () => {
  const { data, isLoading } = useStandings();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Eastern Conference">
        {data?.eastern.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
      <List.Section title="Western Conference">
        {data?.western.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
    </List>
  );
};

export default Standings;
