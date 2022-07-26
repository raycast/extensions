import { List } from "@raycast/api";
import { Team, User } from "../../types";
import { Icon } from "@raycast/api";

const searchBarAccessory = ({
  selectedTeam,
  user,
  teams,
  onChange,
}: {
  selectedTeam: Team | undefined;
  user: User;
  teams: Team[];
  onChange: (teamIdOrUsername: string) => Promise<void>;
}) => (
  <List.Dropdown tooltip="Switch Team" onChange={async (newValue) => await onChange(newValue)}>
    {selectedTeam && <List.Dropdown.Item title={selectedTeam.name} value={selectedTeam.id} icon={Icon.TwoPeople} />}
    <List.Dropdown.Item title={user.username} value={user.username} icon={Icon.Person} />
    {teams?.length &&
      teams
        .filter((team) => team.id !== selectedTeam?.id)
        .map((team) => <List.Dropdown.Item key={team.id} title={team.name} value={team.id} icon={Icon.TwoPeople} />)}
  </List.Dropdown>
);

export default searchBarAccessory;
