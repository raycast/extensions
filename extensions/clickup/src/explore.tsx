import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useTeams } from "./hooks/useTeams";
import { TeamSpaces } from "./views/TeamSpaces";

export default function Teams() {
  const { isLoading, teams } = useTeams();
  return (
    <List searchBarPlaceholder="Search teams" isLoading={isLoading}>
      <List.Section title="/" subtitle={`${teams.length} teams`}>
        {teams.map((team, index) => (
          <List.Item
            key={index}
            icon={Icon.TwoPeople}
            title={team.name}
            actions={
              <ActionPanel title="Team Actions">
                <Action.Push
                  title="Projects Page"
                  target={<TeamSpaces teamId={team?.id ?? ""} teamName={team?.name ?? ""} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
