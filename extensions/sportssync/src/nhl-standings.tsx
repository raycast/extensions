import { List } from "@raycast/api";
import sportInfo from "./utils/getSportInfo";
import getTeamStandings from "./utils/getStandings";
import DisplayTeamStandings from "./templates/standings";

sportInfo.setSportAndLeague("hockey", "nhl");

const displaySchedule = () => {
  const { standingsLoading } = getTeamStandings();

  return (
    <List searchBarPlaceholder="Search for a team" isLoading={standingsLoading}>
      <DisplayTeamStandings />
    </List>
  );
};

export default displaySchedule;
