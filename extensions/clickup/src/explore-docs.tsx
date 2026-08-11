import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "./api/clickup";
import { ListDocs } from "./views/DocList/ListDocs";
import { OpenInClickUpAction } from "./components/OpenInClickUpAction";

export default function Teams() {
  const { isLoading, data: teams } = useCachedPromise(async () => getClickUpClient().getTeams(), [], {
    initialData: [],
  });

  return (
    <List searchBarPlaceholder="Search teams" isLoading={isLoading}>
      <List.Section title="/" subtitle={`${teams.length} teams`}>
        {teams.map((team) => (
          <List.Item
            key={team.id}
            icon={Icon.Person}
            title={team.name}
            actions={
              <ActionPanel title="Team Actions">
                <Action.Push
                  icon={Icon.Eye}
                  title="Docs Page"
                  target={<ListDocs workspaceId={team.id} workspaceName={team.name} />}
                />
                <OpenInClickUpAction route={team.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
