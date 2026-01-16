import { List } from "@raycast/api";
import { Icon } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";
import { Team } from "../../types";

const searchBarAccessory = ({ onTeamChange }: { onTeamChange: () => void }) => {
  const { selectedTeam, teams, updateSelectedTeam } = useVercel();

  const onChange = async (teamIdOrUsername: string) => {
    if (!teamIdOrUsername) {
      return;
    }
    await updateSelectedTeam(teamIdOrUsername);
    onTeamChange();
  };
  const team = teams?.find((x: Team) => x.id === selectedTeam);
  return (
    <List.Dropdown value={selectedTeam} tooltip="Switch Team" onChange={async (newValue) => await onChange(newValue)}>
      {team && <List.Dropdown.Item title={team.name} value={team.id} icon={Icon.TwoPeople} />}
      {teams?.length &&
        teams
          .filter((team: Team) => team.id !== selectedTeam)
          .map((team: Team) => (
            <List.Dropdown.Item key={team.id} title={team.name} value={team.id} icon={Icon.TwoPeople} />
          ))}
    </List.Dropdown>
  );
};

export default searchBarAccessory;
