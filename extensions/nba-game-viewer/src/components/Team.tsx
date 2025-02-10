import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { Team } from "../types/standings.types";
import Roster from "../views/roster";
import Accessory = List.Item.Accessory;

type PropTypes = {
  team: Team;
  league: string;
};

const TeamComponent = ({ team, league }: PropTypes) => {
  const accessories: Accessory[] = [{ text: `W: ${team.wins}` }, { text: `L: ${team.losses}` }];

  if (team.seed !== undefined && team.seed <= 10) {
    accessories.push({
      tag: { value: team.seed.toString(), color: team.seed <= 6 ? Color.Green : Color.Yellow },
      icon: Icon.Leaderboard,
    });
  }

  return (
    <List.Item
      key={team.id}
      title={team.name}
      icon={team.logo}
      accessories={accessories}
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
