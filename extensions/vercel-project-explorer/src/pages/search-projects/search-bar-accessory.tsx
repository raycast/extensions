import { List } from "@raycast/api";
import { Team, User } from "../../types";

const searchBarAccessory = ({
    selectedTeam,
    user,
    teams,
    onChange
}: {
    selectedTeam: Team | undefined;
    user: User;
    teams: Team[];
    onChange: (teamIdOrUsername: string) => void;
}) => (<List.Dropdown tooltip="Switch Team" onChange={onChange}>
    {selectedTeam && <List.Dropdown.Item title={selectedTeam.name} value={selectedTeam.id} />}
    <List.Dropdown.Item title={user.username} value={user.username} />
    {teams?.length && teams.filter((team) => team.id !== selectedTeam?.id).map((team) => <List.Dropdown.Item key={team.id} title={team.name} value={team.id} icon={team.avatar} />)}
</List.Dropdown >);

export default searchBarAccessory;
