import { List } from "@raycast/api";
import { Icon } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";

const searchBarAccessory = ({
  onTeamChange
}: {
  onTeamChange: () => void;
}) => {
  const { user, selectedTeam, teams, updateSelectedTeam } = useVercel();

  const onChange = async (teamIdOrUsername: string) => {
    await updateSelectedTeam(teamIdOrUsername);
    onTeamChange();
  }

  return (<List.Dropdown tooltip="Switch Team" onChange={async (newValue) => await onChange(newValue)}>
    {selectedTeam && <List.Dropdown.Item title={selectedTeam.name} value={selectedTeam.id} icon={Icon.TwoPeople} />}
    {user && <List.Dropdown.Item title={user.username} value={user.username} icon={Icon.Person} />}
    {teams?.length &&
      teams
        .filter((team) => team.id !== selectedTeam?.id)
        .map((team) => <List.Dropdown.Item key={team.id} title={team.name} value={team.id} icon={Icon.TwoPeople} />)}
  </List.Dropdown>)
};

export default searchBarAccessory;
