import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useTeams } from "./hooks/useTeams";
import { ListDocs } from "./views/DocList/ListDocs";

export default function Teams() {
  const { isLoading, teams } = useTeams();
  return (
    <List searchBarPlaceholder="Search teams" isLoading={isLoading}>
      <List.Section title="/" subtitle={`${teams.length} teams`}>
        {teams.map((team, index) => (
          <List.Item
            key={index}
            icon={Icon.Person}
            title={team.name}
            actions={
              <ActionPanel title="Team Actions">
                <Action.Push
                  icon={Icon.Eye}
                  title="Docs Page"
                  target={<ListDocs workspaceId={team.id} workspaceName={team.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
