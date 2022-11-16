import { ActionPanel, PushAction, Icon, List } from "@raycast/api";
import { useTeams } from "./hooks/useTeams";
import { TeamSpaces } from "./views/TeamSpaces";

export default function Teams() {
  const teams = useTeams();
  return (
    <List throttle={true} searchBarPlaceholder="Search Teams" isLoading={teams === undefined}>
      {teams?.map((team, index) => (
        <List.Item
          key={index}
          icon={Icon.Person}
          title={team.name}
          actions={
            <ActionPanel title="Team Actions">
              <PushAction title="Projects Page" target={<TeamSpaces teamId={team?.id} teamName={team?.name} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
