import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getClickUpClient } from "../api/clickup";
import { SpaceFolders } from "./SpaceFolders";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { CopyId } from "../components/actions/CopyActions";
import { buildSpaceRoute } from "../utils/link-helpers";

interface Props {
  teamId: string;
  teamName: string;
}

export function TeamSpaces({ teamId, teamName }: Props) {
  const {
    isLoading,
    data: spaces,
    error,
  } = useCachedPromise(async (id: string) => getClickUpClient().getSpaces(id), [teamId], { initialData: [] });

  if (error && !isLoading) {
    return (
      <List>
        <List.EmptyView
          description={(error as Error).message || "Unknown error"}
          icon={Icon.ExclamationMark}
          title="Failed to load spaces"
        />
      </List>
    );
  }

  return (
    <List
      throttle={true}
      isLoading={isLoading}
      navigationTitle={`${teamName} / Spaces`}
      searchBarPlaceholder="Search spaces"
    >
      <List.Section title="Spaces" subtitle={`${spaces.length} spaces`}>
        {spaces.map((space) => (
          <List.Item
            key={space.id}
            title={space.name}
            icon={space.private ? Icon.Lock : Icon.Globe}
            accessories={[{ tag: space.private ? "Private" : "Public" }]}
            actions={
              <ActionPanel title="Space Actions">
                <Action.Push
                  icon={Icon.ChevronRight}
                  title="Browse Folders"
                  target={<SpaceFolders spaceId={space.id} spaceName={space.name} teamId={teamId} />}
                />
                <OpenInClickUpAction route={buildSpaceRoute(teamId, space.id)} />
                <CopyId id={space.id} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
