import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { Team } from "../types/standings.types";
import Roster from "../views/roster";

type PropTypes = {
  team: Team;
  league: string;
};

const TeamComponent = ({ team, league }: PropTypes) => {
  return (
    <List.Item
      key={team.id}
      title={team.name}
      icon={team.logo}
      accessories={[{ text: `W: ${team.wins}` }, { text: `L: ${team.losses}` }]}
      actions={
        <ActionPanel>
          <Action.Push title="View Roster" icon={Icon.Person} target={<Roster id={team.id} league={league} />} />
          {/* eslint-disable-next-line @raycast/prefer-title-case */}
          <Action.OpenInBrowser title="View Team on ESPN" url={team.link} />
        </ActionPanel>
      }
    />
  );
};

export default TeamComponent;
