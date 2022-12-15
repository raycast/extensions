import { MenuBarExtra, Icon, Color } from "@raycast/api";
import useVercel from "../../hooks/use-vercel-info";

const MenuBarTeamAccessory = ({ onTeamChange }: { onTeamChange: () => void }) => {
  const { user, selectedTeam, teams, updateSelectedTeam } = useVercel();

  const onChange = async (teamIdOrUsername: string) => {
    await updateSelectedTeam(teamIdOrUsername);
    onTeamChange();
  };

  const selectedID = selectedTeam?.id ?? user?.username;

  return (
    <MenuBarExtra.Submenu title={`${selectedTeam?.name ?? user?.name ?? "None"}`} icon={Icon.TwoPeople}>
      <MenuBarExtra.Item title="Personal Account" />
      {user && (
        <MenuBarExtra.Item
          title={user.name || user.username}
          icon={{
            source: Icon.Person,
            tintColor: user.username == selectedID ? Color.Green : Color.PrimaryText,
          }}
          onAction={() => onChange(user.username)}
        />
      )}
      {teams?.length && <MenuBarExtra.Item title="Teams" />}
      {teams?.map((team) => (
        <MenuBarExtra.Item
          key={team.id}
          title={team.name}
          icon={{
            source: Icon.TwoPeople,
            tintColor: team.id == selectedID ? Color.Green : Color.PrimaryText,
          }}
          onAction={() => onChange(team.id)}
        />
      ))}
    </MenuBarExtra.Submenu>
  );
};

export default MenuBarTeamAccessory;
