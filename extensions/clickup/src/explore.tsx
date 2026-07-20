import { ActionPanel, Icon, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "./api/clickup";
import { TeamSpaces } from "./views/TeamSpaces";
import { OpenInClickUpAction } from "./components/OpenInClickUpAction";
import { CopyId } from "./components/actions/CopyActions";

export default function Teams() {
  const { isLoading, data: teams } = useCachedPromise(async () => getClickUpClient().getTeams(), [], {
    initialData: [],
  });

  return (
    <List searchBarPlaceholder="Search teams" isLoading={isLoading} navigationTitle="Tasks Explorer">
      <List.Section title="Teams" subtitle={`${teams.length} teams`}>
        {teams.map((team) => (
          <List.Item
            key={team.id}
            icon={Icon.TwoPeople}
            title={team.name}
            accessories={[{ text: `${team.members?.length ?? 0} members`, icon: Icon.Person }]}
            actions={
              <ActionPanel title="Team Actions">
                <Action.Push
                  icon={Icon.ChevronRight}
                  title="Browse Spaces"
                  target={<TeamSpaces teamId={team.id} teamName={team.name} />}
                />
                <OpenInClickUpAction route={team.id} />
                <CopyId id={team.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
