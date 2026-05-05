import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listObjects, listSpaces, MyMindObject, Space } from "./api";
import { ObjectsCollectionView } from "./components/ObjectsCollectionView";

const SPACE_OBJECTS_LIMIT = 1000;

function SpaceObjectsView({ space }: { space: Space }) {
  const count = space.objects?.length ?? 0;

  return (
    <ObjectsCollectionView
      navigationTitle={`Space: ${space.name}`}
      cacheKey={`space:${space.id}:${count}`}
      load={async (): Promise<MyMindObject[]> => listObjects({ spaceId: space.id, limit: SPACE_OBJECTS_LIMIT })}
      emptyTitle="This space is empty"
    />
  );
}

export default function Command() {
  const {
    isLoading,
    data: spaces = [],
    revalidate,
  } = useCachedPromise(listSpaces, [], {
    onError(error) {
      showFailureToast(error, { title: "Failed to load spaces" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter spaces…">
      {spaces.length === 0 && !isLoading && <List.EmptyView icon={Icon.Folder} title="No spaces yet" />}
      {spaces.map((space) => (
        <List.Item
          key={space.id}
          icon={{ source: Icon.Folder, tintColor: space.color ?? undefined }}
          title={space.name}
          accessories={[{ text: `${space.objects?.length ?? 0} objects` }]}
          actions={
            <ActionPanel>
              <Action.Push title="Open Space" icon={Icon.ArrowRight} target={<SpaceObjectsView space={space} />} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
