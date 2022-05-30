import { List, ActionPanel, Action } from "@raycast/api";
import { Team } from "../standings.types";

type PropTypes = {
  team: Team;
};

const TeamComponent = ({ team }: PropTypes) => {
  return (
    <List.Item
      key={team.id}
      title={team.name}
      icon={team.logo}
      accessories={[{ text: `W: ${team.wins}` }, { text: `L: ${team.losses}` }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="View on ESPN" url={team.link} />
        </ActionPanel>
      }
    />
  );
};

export default TeamComponent;
