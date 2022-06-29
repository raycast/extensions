import { List, Toast, showToast } from "@raycast/api";
import { Team } from "../types/standings.types";
import useStandings from "../hooks/useStandings";
import TeamComponent from "../components/Team";

const Standings = () => {
  const data = useStandings();

  if (data.error) {
    showToast(Toast.Style.Failure, "Failed to get roster");
    data.loading = false;
  }

  return (
    <List isLoading={data.loading}>
      <List.Section title="Eastern Conference">
        {data.standings.eastern.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
      <List.Section title="Western Conference">
        {data.standings.western.map((team: Team) => {
          return <TeamComponent key={team.id} team={team} />;
        })}
      </List.Section>
    </List>
  );
};

export default Standings;
