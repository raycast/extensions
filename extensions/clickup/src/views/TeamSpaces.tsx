import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { SpaceFolders } from "./SpaceFolders";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";

interface Props {
  teamId: string;
  teamName: string;
}

export function TeamSpaces({ teamId, teamName }: Props) {
  const { isLoading, data: spaces } = useCachedPromise(
    async (id: string) => getClickUpClient().getSpaces(id),
    [teamId],
    { initialData: [] },
  );

  return (
    <List throttle={true} isLoading={isLoading} navigationTitle={`${teamName} Spaces`}>
      <List.Section title={`Teams / ${teamId}`} subtitle={`${spaces.length} spaces`}>
        {spaces.map((space) => (
          <List.Item
            key={space.id}
            title={space.name}
            subtitle={`ID: ${space.id}`}
            icon={Icon.Pin}
            actions={
              <ActionPanel title="Space Actions">
                <Action.Push
                  icon={Icon.Folder}
                  title="Folders Page"
                  target={<SpaceFolders spaceId={space.id} spaceName={space.name} />}
                />
                <OpenInClickUpAction route={`${teamId}/v/o/s/${space.id}`} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
