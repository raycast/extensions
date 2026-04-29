import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { listObjects, listTags, MyMindObject } from "./api";
import { ObjectsCollectionView } from "./components/ObjectsCollectionView";

function escapeTag(name: string): string {
  return name.replace(/"/g, '\\"');
}

function TagObjectsView({ tagName }: { tagName: string }) {
  return (
    <ObjectsCollectionView
      navigationTitle={`Tag: ${tagName}`}
      cacheKey={`tag:${tagName}`}
      load={async (): Promise<MyMindObject[]> => {
        return listObjects({ q: `tag:"${escapeTag(tagName)}"`, limit: 1000 });
      }}
      emptyTitle="No cards with this tag"
    />
  );
}

export default function Command() {
  const {
    isLoading,
    data: tags = [],
    revalidate,
  } = useCachedPromise(listTags, [], {
    onError(error) {
      showFailureToast(error, { title: "Failed to load tags" });
    },
  });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter tags…">
      {tags.length === 0 && !isLoading && <List.EmptyView icon={Icon.Tag} title="No tags yet" />}
      {tags.map((tag) => (
        <List.Item
          key={tag.name}
          icon={Icon.Tag}
          title={tag.name}
          actions={
            <ActionPanel>
              <Action.Push title="Show Cards" icon={Icon.ArrowRight} target={<TagObjectsView tagName={tag.name} />} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
