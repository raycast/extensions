import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { getObjectsByIds, listSpaces, MyMindObject, Space } from "./api";
import { ObjectsCollectionView } from "./components/ObjectsCollectionView";

function SpaceObjectsView({ space }: { space: Space }) {
  const ids = (space.objects ?? []).map((o) => o.id);

  return (
    <ObjectsCollectionView
      navigationTitle={`Space: ${space.name}`}
      cacheKey={`space:${space.id}:${ids.length}`}
      load={async (): Promise<MyMindObject[]> => getObjectsByIds(ids)}
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
