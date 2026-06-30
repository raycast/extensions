import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listSpaces } from "./api";
import { SpaceObjectList } from "./components/SpaceObjectList";
import { Space } from "./types";

function getSpaceIcon(space: Space) {
  return {
    source: Icon.Circle,
    tintColor: isSupportedColor(space.color) ? space.color : Color.SecondaryText,
  };
}

function isSupportedColor(value?: string): value is string {
  if (!value) {
    return false;
  }

  return /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value.trim());
}

export default function SearchSpacesCommand() {
  const { data: spaces = [], isLoading } = useCachedPromise(() => listSpaces(), [], {
    onError: (error) => {
      void showFailureToast(error, { title: "Couldn't load your spaces" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Browse your mymind spaces…">
      {spaces.length === 0 ? <List.EmptyView title="No Spaces" description="You haven't created any spaces yet." /> : null}
      {spaces.map((space) => (
        <List.Item
          key={space.id}
          icon={getSpaceIcon(space)}
          title={space.name}
          actions={
            <ActionPanel>
              <Action.Push title="Show Items" target={<SpaceObjectList space={space} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
