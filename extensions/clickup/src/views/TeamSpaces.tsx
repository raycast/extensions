import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useSpaces } from "../hooks/useSpaces";
import { SpaceFolders } from "./SpaceFolders";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";

function TeamSpaces({ teamId, teamName }: { teamId: string; teamName: string }) {
  const { isLoading, spaces } = useSpaces(teamId);
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

export { TeamSpaces };
