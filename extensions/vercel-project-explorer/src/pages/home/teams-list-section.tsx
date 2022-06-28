import { ActionPanel, Icon, List, useNavigation, Action } from "@raycast/api";
import { Team } from "../../types";
import ChooseTeamList from "../choose-team-list";

type Props = {
  teams?: Team[];
  setTeam: (team?: Team) => void;
  selectedTeam?: Team;
};

const TeamListSection = ({ teams, setTeam, selectedTeam }: Props) => {
  const { push } = useNavigation();

  return (
    <List.Section title="Teams">
      <List.Item
        title="Switch team..."
        icon={Icon.Globe}
        subtitle={selectedTeam ? selectedTeam.name : "Select a team to view its projects"}
        actions={
          <ActionPanel>
            <Action
              title="Switch team..."
              icon={{ source: Icon.Globe }}
              onAction={() => push(<ChooseTeamList teams={teams} setTeam={setTeam} selectedTeam={selectedTeam} />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title="Create New Team"
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={`https://vercel.com/teams/create`} icon={Icon.Link} />
          </ActionPanel>
        }
      />
    </List.Section>
  );
};

export { TeamListSection, ChooseTeamList };

export default TeamListSection;
