import { List } from "@raycast/api";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";

const Standings = () => {
  const { data, isLoading } = useStandings();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Eastern Conference">
        {data?.eastern.map((team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
      <List.Section title="Western Conference">
        {data?.western.map((team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
    </List>
  );
};

export default Standings;
