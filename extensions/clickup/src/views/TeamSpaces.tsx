import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { useSpaces } from "../hooks/useSpaces";
import { SpaceFolders } from "./SpaceFolders";

function TeamSpaces({ teamId, teamName }: { teamId: string; teamName: string }) {
  const spaces = useSpaces(teamId);
  return (
    <List throttle={true} isLoading={spaces === undefined} navigationTitle={`${teamName} Spaces`}>
      {spaces?.map((space) => (
        <List.Item
          key={space.id}
          title={space.name}
          subtitle={`ID: ${space.id}`}
          icon={Icon.Pin}
          actions={
            <ActionPanel title="Space Actions">
              <PushAction title="Folders Page" target={<SpaceFolders spaceId={space?.id} spaceName={space?.name} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export { TeamSpaces };
